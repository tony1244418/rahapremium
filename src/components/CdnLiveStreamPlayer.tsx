'use client';

// ────────────────────────────────────────────────────────────────────────────
// CdnLiveStreamPlayer
//
// Spec-exact reference Shaka DASH player for token-service-backed CDN streams.
//
// HARD RULES implemented here (each maps to a real production bug):
//   • Fresh token on every channel open: fetch('/api/cdn-token?t=' + Date.now()).
//   • The live token lives in a useRef (latestTokenRef), NOT useState — updating
//     it must never re-render and restart the player.
//   • While open, the token is refreshed every 2 minutes via setInterval.
//   • A Shaka request filter injects the LATEST token into EVERY chunk request
//     (manifest + segments), not just once at startup.
//   • On channel switch / unmount: set `cancelled`, destroy the Shaka instance,
//     clear the refresh interval.
// ────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';

interface CdnLiveStreamPlayerProps {
  /** Channel identifier as known to the token service, e.g. "AzamOne". */
  channel: string;
  /** Optional display name. */
  title?: string;
  className?: string;
}

export default function CdnLiveStreamPlayer({ channel, title, className }: CdnLiveStreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Live token — deliberately a ref so refreshes never re-render the player.
  const latestTokenRef = useRef<string | null>(null);
  // Shaka player instance kept in a ref for cleanup.
  const playerRef = useRef<any>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<'loading' | 'playing' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    // Always fetch a FRESH token — never cached longer than the service allows.
    const fetchToken = async (): Promise<string | null> => {
      try {
        const res = await fetch(`/api/cdn-token?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.token || null;
      } catch {
        return null;
      }
    };

    // Resolve the manifest URL for this channel via the server proxy. The proxy
    // keeps the API key secret and returns a tok_-embedded .mpd URL.
    const fetchPlayUrl = async (): Promise<string | null> => {
      try {
        const res = await fetch(`/api/play/${encodeURIComponent(channel)}?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.url || null;
      } catch {
        return null;
      }
    };

    const init = async () => {
      setStatus('loading');
      setErrorMsg('');

      // Shaka touches `window`; import it only in the browser.
      const shakaModule = await import('shaka-player/dist/shaka-player.compiled.js');
      const shaka = (shakaModule as any).default || shakaModule;
      if (cancelled) return;

      shaka.polyfill.installAll();
      if (!shaka.Player.isBrowserSupported()) {
        setStatus('error');
        setErrorMsg('This browser is not supported.');
        return;
      }

      const [token, playUrl] = await Promise.all([fetchToken(), fetchPlayUrl()]);
      if (cancelled) return;

      if (!token) {
        setStatus('error');
        setErrorMsg('Could not get a CDN token. Please try again.');
        return;
      }
      if (!playUrl) {
        setStatus('error');
        setErrorMsg('Could not resolve the stream URL for this channel.');
        return;
      }

      latestTokenRef.current = token;

      const video = videoRef.current;
      if (!video) return;

      const player = new shaka.Player(video);
      playerRef.current = player;

      player.addEventListener('error', (e: any) => {
        console.error('[CdnLiveStreamPlayer] Shaka error:', e?.detail || e);
        if (!cancelled) {
          setStatus('error');
          setErrorMsg('Playback error. The stream may be unavailable.');
        }
      });

      // Inject the LATEST token into EVERY request (manifest + every segment).
      player.getNetworkingEngine().registerRequestFilter((_type: any, request: any) => {
        if (latestTokenRef.current && request.uris?.[0]) {
          try {
            const u = new URL(request.uris[0]);
            u.searchParams.set('cdntoken', latestTokenRef.current);
            request.uris[0] = u.toString();
          } catch {
            /* leave the URI untouched if it isn't parseable */
          }
        }
      });

      try {
        await player.load(playUrl);
        if (cancelled) return;
        setStatus('playing');
        video.play().catch(() => {/* autoplay may require a user gesture */});
      } catch (err) {
        if (!cancelled) {
          console.error('[CdnLiveStreamPlayer] load failed:', err);
          setStatus('error');
          setErrorMsg('Failed to load the stream.');
        }
      }

      // Refresh the token every 2 minutes. We only update the ref — no re-render,
      // so the player keeps playing and the request filter picks up the new value.
      refreshIntervalRef.current = setInterval(async () => {
        const fresh = await fetchToken();
        if (!cancelled && fresh) {
          latestTokenRef.current = fresh;
        }
      }, 2 * 60 * 1000);
    };

    init();

    // Cleanup on channel switch / unmount.
    return () => {
      cancelled = true;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.destroy().catch(() => {});
        playerRef.current = null;
      }
    };
  }, [channel]);

  return (
    <div className={className ?? 'w-full'}>
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          autoPlay
          playsInline
        />
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm">
            Loading {title || channel}…
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-red-300 text-sm px-4 text-center">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
