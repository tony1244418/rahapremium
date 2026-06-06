'use client';

import React, { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import MainLayout from '@/components/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlatformControls } from '@/contexts/PlatformControlContext';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Radio, Play, Lock, Wrench, Search, X, Grid2X2, List, AlertCircle, RotateCcw,
} from 'lucide-react';
import { subscribeToLiveChannels } from '@/lib/live-channels';
import { LiveChannel } from '@/types';
import { hasAccessToContent } from '@/lib/subscriptions';
import { motion, AnimatePresence } from 'framer-motion';
import { Loading } from '@/components/ui/Loading';
import LiveTvSlider from '@/components/LiveTvSlider';
import Hls from 'hls.js';
import { supabase } from '@/lib/supabase';

const CATEGORY_COLORS: Record<string, string> = {
  sports:       'from-blue-600 to-blue-800',
  news:         'from-slate-600 to-slate-800',
  entertainment:'from-blue-500 to-indigo-700',
  music:        'from-indigo-500 to-blue-700',
  kids:         'from-sky-500 to-blue-600',
  documentary:  'from-slate-500 to-blue-700',
  movies:       'from-blue-700 to-slate-700',
};

const getCategoryGradient = (cat?: unknown): string => {
  if (!cat || typeof cat !== 'string') return 'from-blue-700 to-slate-800';
  return CATEGORY_COLORS[cat.toLowerCase()] ?? 'from-blue-700 to-slate-800';
};

function LiveTVContent() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { toggles } = usePlatformControls();
  const router = useRouter();
  const searchParams = useSearchParams();
  const channelIdFromUrl = searchParams.get('channel');

  const [allChannels, setAllChannels] = useState<LiveChannel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<LiveChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<LiveChannel | null>(null);
  const [clickSource, setClickSource] = useState<'slider' | 'grid' | 'list' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const playerContainerRef = useRef<HTMLDivElement>(null);
  // Always fetch a fresh CDN token on demand — never cache it here
  const fetchCdnToken = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch(`/api/cdn-token?t=${Date.now()}`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        return data?.token || '';
      }
    } catch (err) {
      console.error('Error fetching CDN token:', err);
    }
    return '';
  }, []);

  useEffect(() => {
    const unsub = subscribeToLiveChannels((channels) => {
      setAllChannels(channels);
      setLoading(false);
    });
    const t = setTimeout(() => setLoading(false), 6000);
    return () => { unsub(); clearTimeout(t); };
  }, []);

  // Handle URL param correctly with access checks
  useEffect(() => {
    // Wait until auth is done and channels are loaded
    if (authLoading || allChannels.length === 0 || !channelIdFromUrl) return;
    
    // Process only if no channel is currently selected
    if (!selectedChannel) {
      const found = allChannels.find(c => c.id === channelIdFromUrl);
      if (found) {
        handleChannelClick(found, 'list');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelIdFromUrl, allChannels.length, authLoading]);

  useEffect(() => {
    if (selectedChannel) {
      setTimeout(() => {
        playerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [selectedChannel?.id]);

  useEffect(() => {
    let list = [...allChannels];
    if (selectedCategory !== 'all') {
      list = list.filter(ch =>
        Array.isArray(ch.category)
          ? ch.category.some(c => c.toLowerCase() === selectedCategory.toLowerCase())
          : false
      );
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(ch =>
        ch.name.toLowerCase().includes(q) ||
        (Array.isArray(ch.category) && ch.category.some(c => c.toLowerCase().includes(q)))
      );
    }
    setFilteredChannels(list);
  }, [allChannels, selectedCategory, searchQuery]);

  const activeChannels = filteredChannels.filter(ch => ch.isActive && !ch.isMaintenance);
  const maintenanceChannels = filteredChannels.filter(ch => ch.isMaintenance);

  // Channels marked for the slider (only active, non-maintenance, non-adult)
  const sliderChannels = allChannels.filter(
    ch => ch.showInSlider && ch.isActive && !ch.isMaintenance && !ch.isAdult
  );

  const allCategories = Array.from(new Set(
    allChannels
      .flatMap(ch => Array.isArray(ch.category) ? ch.category as string[] : [])
      .filter(cat => typeof cat === 'string' && cat.trim().length > 0)
  ));

  const TRIAL_DURATION = 30; // seconds
  const TRIAL_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in ms

  async function handleChannelClick(channel: LiveChannel, source?: 'slider' | 'grid' | 'list') {
    if (!user) {
      router.push(`/auth?redirect=${encodeURIComponent(`/live-tv?channel=${channel.id}`)}`);
      return;
    }
    
    // Explicitly check if user has an active package. We treat all live channels as premium.
    const userHasAnyPackage = user?.subscription?.isActive === true;
    const hasAccess = userHasAnyPackage && hasAccessToContent(user, channel.requiredPackages);

    if (!hasAccess) {
      // Premium channel — check server-side trial eligibility
      try {
        const res = await fetch(`/api/live-trial?userId=${user.uid}`);
        const data = await res.json();
        
        if (!data.canTrial) {
          // Trial already used recently — show subscribe page
          router.push(`/subscriptions?redirect=${encodeURIComponent(`/live-tv?channel=${channel.id}`)}`);
          return;
        }

        // Mark trial as used via API
        await fetch('/api/live-trial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid })
        });
        
        // Save locally just for the visual countdown timer on the frontend
        try { localStorage.setItem('livetvTrialLastUsed', Date.now().toString()); } catch {}
        
        setIsTrial(true);
        setTrialSecondsLeft(TRIAL_DURATION);
        setTrialExpired(false);
      } catch (err) {
        console.error('Error fetching trial status:', err);
        // Fallback to strict access if API fails
        router.push(`/subscriptions?redirect=${encodeURIComponent(`/live-tv?channel=${channel.id}`)}`);
        return;
      }
    } else {
      setIsTrial(false);
      setTrialSecondsLeft(TRIAL_DURATION);
      setTrialExpired(false);
    }
    setClickSource(source || null);
    setSelectedChannel(channel);
  };

  // ─── Inline smart player ────────────────────────────────────────────────────
  const inlineVideoRef = useRef<HTMLVideoElement>(null);
  const inlineShakaRef = useRef<any>(null);
  const inlineHlsRef  = useRef<any>(null);
  const trialTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [trialSecondsLeft, setTrialSecondsLeft] = useState(30);
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialResetIn, setTrialResetIn] = useState<string>('');
  const [qualityTracks, setQualityTracks] = useState<any[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<number | null>(null);
  const [audioLanguages, setAudioLanguages] = useState<string[]>([]);
  const [activeLanguage, setActiveLanguage] = useState<string>('');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Update trial reset countdown every second
  useEffect(() => {
    if (!trialExpired) return;
    const update = () => {
      try {
        const stored = localStorage.getItem('livetvTrialLastUsed');
        if (!stored) { setTrialResetIn(''); return; }
        const resetAt = parseInt(stored, 10) + 24 * 60 * 60 * 1000;
        const diff = Math.max(0, resetAt - Date.now());
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTrialResetIn(`${h}h ${m}m ${s}s`);
      } catch { setTrialResetIn(''); }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [trialExpired]);

  // Destroy previous player instances
  const destroyInlinePlayers = useCallback(() => {
    if (trialTimerRef.current) { clearInterval(trialTimerRef.current); trialTimerRef.current = null; }
    if (inlineShakaRef.current) {
      inlineShakaRef.current.destroy().catch(() => {});
      inlineShakaRef.current = null;
    }
    if (inlineHlsRef.current) {
      inlineHlsRef.current.destroy();
      inlineHlsRef.current = null;
    }
    if (inlineVideoRef.current) {
      inlineVideoRef.current.pause();
      inlineVideoRef.current.removeAttribute('src');
      inlineVideoRef.current.load();
    }
  }, []);

  // Initialize player whenever selectedChannel changes
  useEffect(() => {
    if (!selectedChannel) { destroyInlinePlayers(); return; }
    if (selectedChannel.videoEmbedCode) return; // iframe embed — no player needed

    setPlayerError(null);
    setPlayerLoading(true);
    setTrialExpired(false);
    setQualityTracks([]);
    setAudioLanguages([]);
    setActiveTrackId(null);
    setActiveLanguage('');
    setShowQualityMenu(false);
    setShowLangMenu(false);
    destroyInlinePlayers();

    const video = inlineVideoRef.current;
    if (!video) return;

    // Always fetch a fresh token before starting any channel
    let cancelled = false;
    (async () => {
      const cdnToken = await fetchCdnToken();
      if (cancelled) return;

      // Build URL — for DASH/clearkey: append cdntoken= directly (no proxy)
      let url = selectedChannel.streamUrl;

      // Detect iOS devices (iPhone, iPad, iPod)
      const isIOS = typeof navigator !== 'undefined' && 
        (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

      if (cdnToken && !url.includes('cdntoken=') && !url.includes('token=')) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}cdntoken=${cdnToken}`;
      }

      let parsedClearKeys = selectedChannel.clearKeys;
      if (typeof parsedClearKeys === 'string') {
        try {
          parsedClearKeys = JSON.parse(parsedClearKeys);
        } catch (e) {
          console.error('Failed to parse clearKeys:', e);
          parsedClearKeys = {};
        }
      }

      let fmt = selectedChannel.streamFormat || '';
      let isDash = fmt === 'dash' || url.includes('.mpd');
      let isHls  = fmt === 'hls'  || url.includes('.m3u8');
      let hasClearKey = selectedChannel.encryptionType === 'clearkey' &&
        parsedClearKeys && Object.keys(parsedClearKeys).length > 0;

      // For iOS: Use Railway Proxy Server which decrypts the DASH stream and serves clean HLS
      if (isIOS && (isDash || hasClearKey)) {
        const RAILWAY_URL = 'https://rahapremium-proxy-production.up.railway.app';
        // Use channel ID as slug (unique identifier)
        const channelSlug = selectedChannel.id;

        console.log('[iOS] Using Railway proxy for channel:', channelSlug);

        // Poll Railway until stream is ready (max 30 seconds)
        let proxyUrl: string | null = null;
        for (let i = 0; i < 6; i++) {
          try {
            const proxyRes = await fetch(`${RAILWAY_URL}/watch/${channelSlug}`);
            const proxyData = await proxyRes.json();
            if (proxyData.status === 'ready') {
              proxyUrl = `${RAILWAY_URL}${proxyData.url}`;
              break;
            }
            // Stream is starting — wait 5 seconds and try again
            await new Promise(r => setTimeout(r, 5000));
          } catch (e) {
            console.error('[iOS] Railway proxy error:', e);
            break;
          }
        }

        if (proxyUrl) {
          url = proxyUrl;
          isDash = false;
          hasClearKey = false;
          isHls = true;
          console.log('[iOS] Stream ready from Railway:', url);
        } else {
          // Fallback: try direct HLS if Railway fails
          if (selectedChannel.streamUrl.includes('/DASH/') && selectedChannel.streamUrl.includes('.mpd')) {
            url = selectedChannel.streamUrl.replace('/DASH/', '/HLS/').replace('.mpd', '.m3u8');
            if (cdnToken) url += (url.includes('?') ? '&' : '?') + `cdntoken=${cdnToken}`;
          }
          isDash = false;
          hasClearKey = false;
          isHls = true;
          console.warn('[iOS] Railway fallback to direct HLS:', url);
        }
      }

      // Attempt to play unmuted first (best user experience)
      // If browser policy blocks it, fallback to muted autoplay
      const onReady = () => {
        setPlayerLoading(false);
        video.muted = false;
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });

        // Start 30s trial countdown if in trial mode
        if (isTrial) {
          let left = TRIAL_DURATION;
          trialTimerRef.current = setInterval(() => {
            left -= 1;
            setTrialSecondsLeft(left);
            if (left <= 0) {
              clearInterval(trialTimerRef.current!);
              trialTimerRef.current = null;
              // Completely destroy player to prevent native controls from resuming
              destroyInlinePlayers();
              setTrialExpired(true);
            }
          }, 1000);
        }
      };
      const onErr = (msg: string) => { setPlayerLoading(false); setPlayerError(msg); };

      if (isDash || hasClearKey) {
        // --- Shaka Player for DASH / ClearKey ---
        try {
          const shakaModule = await import('shaka-player');
          const shaka = (shakaModule as any).default ?? shakaModule;
          shaka.polyfill.installAll();
          if (!shaka.Player.isBrowserSupported()) throw new Error('Browser not supported');

          if (cancelled) return;
          const player = new shaka.Player();
          await player.attach(video);
          inlineShakaRef.current = player;

          // Configure DRM — matches: player.configure({ drm: { clearKeys: clearKeys } })
          player.configure({
            drm: hasClearKey
              ? { clearKeys: parsedClearKeys }
              : {},
          });

          // NO proxy, NO request filter — load directly from CDN
          await player.load(url);
          if (cancelled) { player.destroy(); return; }
          onReady();

          // Populate quality tracks and audio languages after load
          const tracks = player.getVariantTracks();
          if (tracks && tracks.length > 1) {
            const byHeight = new Map<number, any>();
            tracks.forEach((t: any) => {
              const h = t.height || 0;
              if (!byHeight.has(h) || t.bandwidth > byHeight.get(h).bandwidth) {
                byHeight.set(h, t);
              }
            });
            const dedupedTracks = Array.from(byHeight.values()).sort((a, b) => (b.height || 0) - (a.height || 0));
            setQualityTracks(dedupedTracks);
            const active = tracks.find((t: any) => t.active);
            if (active) setActiveTrackId(active.id);
          }
          const langs = player.getAudioLanguages ? player.getAudioLanguages() : [];
          if (langs && langs.length > 1) {
            setAudioLanguages(langs);
            setActiveLanguage(player.getConfiguration().preferredAudioLanguage || langs[0]);
          }
        } catch (err: any) {
          if (!cancelled) onErr(`Player init failed: ${err?.message || err}`);
        }

      } else if (isHls) {
        // --- HLS.js ---
        if (Hls.isSupported()) {
          const hls = new Hls({ lowLatencyMode: true, maxBufferLength: 30 });
          inlineHlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            if (cancelled) return;
            onReady();
            // Populate HLS Quality Tracks
            if (data.levels && data.levels.length > 1) {
              const tracks = data.levels.map((l: any, i: number) => ({ id: i, height: l.height, bandwidth: l.bitrate }));
              const sorted = tracks.sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
              setQualityTracks(sorted);
              setActiveTrackId(null);
            }
            // Populate HLS Audio Languages
            if (hls.audioTracks && hls.audioTracks.length > 1) {
              const langs = hls.audioTracks.map((t: any) => t.name || t.lang || 'Unknown');
              setAudioLanguages(langs);
              if (hls.audioTrack > -1 && hls.audioTracks[hls.audioTrack]) {
                setActiveLanguage(hls.audioTracks[hls.audioTrack].name || hls.audioTracks[hls.audioTrack].lang || 'Unknown');
              }
            }
          });
          hls.on(Hls.Events.ERROR, (_: any, data: any) => {
            if (data.fatal && !cancelled) onErr('HLS error — stream unreachable or unsupported format.');
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url;
          video.addEventListener('loadedmetadata', onReady, { once: true });
        } else {
          onErr('HLS is not supported in this browser.');
        }

      } else {
        // --- Direct MP4 / other ---
        video.src = url;
        video.addEventListener('loadedmetadata', onReady, { once: true });
        video.addEventListener('error', () => { if (!cancelled) onErr('Failed to load stream.'); }, { once: true });
      }

    })(); // end async IIFE
    return () => {
      cancelled = true;
      destroyInlinePlayers();
    };
  }, [selectedChannel?.id, destroyInlinePlayers, fetchCdnToken]);

  const renderPlayer = () => {
    if (!selectedChannel) return null;
    return (
      <AnimatePresence>
        <motion.div
          ref={playerContainerRef}
          initial={{ opacity: 0, y: -20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.97 }}
          className="rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/6 scroll-mt-24 w-full"
        >
          <div className="relative aspect-video bg-black group">
            {/* Embed code (iframe) */}
            {selectedChannel.videoEmbedCode ? (
              <div
                className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
                dangerouslySetInnerHTML={{ __html: selectedChannel.videoEmbedCode }}
              />
            ) : (
              <>
                {/* Smart video player (Shaka / HLS / direct) */}
                <video
                  ref={inlineVideoRef}
                  className="w-full h-full object-contain"
                  playsInline
                  autoPlay
                  muted
                  controls
                  poster={selectedChannel.thumbnailUrl}
                />

                {/* Trial countdown badge */}
                {isTrial && !trialExpired && !playerLoading && (
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur-sm border border-yellow-500/40 rounded-xl">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-yellow-400">
                      Free Trial: {trialSecondsLeft}s
                    </span>
                  </div>
                )}

                {/* Trial expired overlay */}
                {trialExpired && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                    <div className="text-center text-white max-w-xs w-full">
                      {/* Lock icon */}
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-600/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </div>
                      <h3 className="text-lg font-black text-white mb-1">Trial Ended</h3>
                      <p className="text-sm text-gray-400 mb-5">
                        Your 30-second free trial is over. Subscribe to keep watching {selectedChannel.name}.
                      </p>
                      <button
                        onClick={() => router.push(`/subscriptions?redirect=${encodeURIComponent(`/live-tv?channel=${selectedChannel.id}`)}`)}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl text-sm font-bold text-white transition-all duration-200 shadow-lg shadow-blue-600/30 mb-3"
                      >
                        Subscribe Now
                      </button>
                      {trialResetIn && (
                        <p className="text-xs text-gray-500">
                          Free trial resets in{' '}
                          <span className="text-yellow-400 font-semibold">{trialResetIn}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Loading overlay */}
                {playerLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                    <div className="text-center text-white">
                      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-gray-300">Loading stream...</p>
                    </div>
                  </div>
                )}

                {/* Error overlay */}
                {playerError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10 p-4">
                    <div className="text-center text-white max-w-sm">
                      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-300 mb-4">{playerError}</p>
                      <button
                        onClick={() => { setPlayerError(null); setSelectedChannel({ ...selectedChannel }); }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium mx-auto transition-colors"
                      >
                        <RotateCcw size={14} /> Retry
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Close button */}
            <button
              onClick={() => { setSelectedChannel(null); destroyInlinePlayers(); }}
              className="absolute top-3 right-3 w-8 h-8 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/10 z-20"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 bg-dark-900">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <h3 className="font-bold text-white">{selectedChannel.name}</h3>
                {selectedChannel.category && (
                  <span className="text-xs text-blue-400 capitalize">{selectedChannel.category}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-600/20 border border-red-500/30 rounded-full">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-red-400">LIVE</span>
              </div>
            </div>

            {/* Quality & Language Controls */}
            {(qualityTracks.length > 1 || audioLanguages.length > 1) && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">

                {/* Quality Selector */}
                {qualityTracks.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => { setShowQualityMenu(v => !v); setShowLangMenu(false); }}
                      className="group flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-xl text-xs font-semibold text-white transition-all duration-200 backdrop-blur-sm"
                    >
                      {/* Settings icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                      </svg>
                      <span className="text-white/90">
                        {activeTrackId === null
                          ? 'Auto'
                          : (() => { const t = qualityTracks.find(t => t.id === activeTrackId); return t?.height ? `${t.height}p` : 'Auto'; })()}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${showQualityMenu ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>

                    {showQualityMenu && (
                      <div className="absolute bottom-full mb-2 left-0 bg-[#1a1d2e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 z-30 min-w-[140px] backdrop-blur-xl">
                        <div className="px-3.5 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">
                          Video Quality
                        </div>
                        {/* Auto option */}
                        <button
                          onClick={() => {
                            if (inlineShakaRef.current) {
                              inlineShakaRef.current.configure({ abr: { enabled: true } });
                              setActiveTrackId(null);
                            } else if (inlineHlsRef.current) {
                              inlineHlsRef.current.currentLevel = -1;
                              setActiveTrackId(null);
                            }
                            setShowQualityMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium transition-all duration-150 ${
                            activeTrackId === null
                              ? 'bg-blue-600/20 text-blue-400'
                              : 'text-gray-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span>Auto</span>
                          {activeTrackId === null && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                        </button>
                        <div className="h-px bg-white/5 mx-2"/>
                        {qualityTracks.map(track => (
                          <button
                            key={track.id}
                            onClick={() => {
                              if (inlineShakaRef.current) {
                                inlineShakaRef.current.configure({ abr: { enabled: false } });
                                inlineShakaRef.current.selectVariantTrack(track, true);
                                setActiveTrackId(track.id);
                              } else if (inlineHlsRef.current) {
                                inlineHlsRef.current.currentLevel = track.id;
                                setActiveTrackId(track.id);
                              }
                              setShowQualityMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium transition-all duration-150 ${
                              activeTrackId === track.id
                                ? 'bg-blue-600/20 text-blue-400'
                                : 'text-gray-300 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{track.height ? `${track.height}p` : '—'}</span>
                              {track.height >= 1080 && <span className="text-[9px] px-1 py-0.5 bg-blue-600/30 text-blue-300 rounded font-bold">HD</span>}
                            </span>
                            <span className="text-gray-500 text-[10px]">
                              {track.bandwidth ? `${Math.round(track.bandwidth / 1000)}k` : ''}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Language Selector */}
                {audioLanguages.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => { setShowLangMenu(v => !v); setShowQualityMenu(false); }}
                      className="group flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-xl text-xs font-semibold text-white transition-all duration-200 backdrop-blur-sm"
                    >
                      {/* Audio icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                      <span className="text-white/90">{activeLanguage ? activeLanguage.toUpperCase() : 'Audio'}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${showLangMenu ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>

                    {showLangMenu && (
                      <div className="absolute bottom-full mb-2 left-0 bg-[#1a1d2e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 z-30 min-w-[140px] backdrop-blur-xl">
                        <div className="px-3.5 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">
                          Audio Track
                        </div>
                        {audioLanguages.map(lang => (
                          <button
                            key={lang}
                            onClick={() => {
                              if (inlineShakaRef.current) {
                                inlineShakaRef.current.selectAudioLanguage(lang);
                                setActiveLanguage(lang);
                              } else if (inlineHlsRef.current) {
                                const idx = inlineHlsRef.current.audioTracks.findIndex((t: any) => (t.name || t.lang) === lang);
                                if (idx !== -1) {
                                  inlineHlsRef.current.audioTrack = idx;
                                  setActiveLanguage(lang);
                                }
                              }
                              setShowLangMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium transition-all duration-150 ${
                              activeLanguage === lang
                                ? 'bg-blue-600/20 text-blue-400'
                                : 'text-gray-300 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <span>{lang.toUpperCase()}</span>
                            {activeLanguage === lang && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loading size="lg" text="Loading channels..." variant="bar" />
      </div>
    );
  }

  return (
    <div className="container-mobile space-y-6 pb-24">

      {/* Page header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
          <Radio size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Live TV</h1>
        </div>
      </div>

      {/* Featured Slider or Top Player */}
      {(!clickSource || clickSource === 'slider') && selectedChannel ? (
        <section>{renderPlayer()}</section>
      ) : (
        toggles.liveTvSliderEnabled && sliderChannels.length > 0 && (
          <section>
            <LiveTvSlider channels={sliderChannels} onChannelClick={(ch) => handleChannelClick(ch, 'slider')} />
          </section>
        )
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={17} />
        <input
          type="text"
          placeholder="Search channels..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-dark-800/80 backdrop-blur-sm border border-dark-700/60 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all text-sm"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Category pills + view toggle */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['all', ...Array.from(new Set(allCategories))].map((cat, index) => (
            <button
              key={`cat-${index}-${cat}`}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all duration-200 ${
                selectedCategory === cat
                  ? `bg-gradient-to-r ${getCategoryGradient(cat === 'all' ? undefined : cat)} text-white shadow-md shadow-blue-600/30`
                  : 'bg-dark-800 text-gray-400 hover:text-white border border-dark-700/60'
              }`}
            >
              {cat === 'all' ? 'All Channels' : cat}
            </button>
          ))}
        </div>

        {/* View mode */}
        <div className="flex-shrink-0 flex bg-dark-800 rounded-xl border border-dark-700/60 overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'} transition-colors`}
          >
            <Grid2X2 size={15} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'} transition-colors`}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Active channels */}
      {activeChannels.length > 0 && (
        <section>
          <div
            className={`${viewMode === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4'
              : 'space-y-2'
            }`}
          >
            {activeChannels.map((channel, index) => {
              const hasAccess = hasAccessToContent(user, channel.requiredPackages);
              const gradient = getCategoryGradient(channel.category);

              if (viewMode === 'list') {
                if (selectedChannel?.id === channel.id && clickSource === 'list') {
                  return (
                    <div key={`player-${channel.id}`} className="w-full mb-4">
                      {renderPlayer()}
                    </div>
                  );
                }
                return (
                  <motion.button
                    key={channel.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleChannelClick(channel, 'list')}
                    className="w-full flex items-center gap-3 p-3 bg-dark-800/60 hover:bg-dark-700/80 border border-dark-700/50 rounded-2xl transition-all text-left group"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                      {channel.thumbnailUrl ? (
                        <img src={channel.thumbnailUrl} alt={channel.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                          <Radio size={18} className="text-white/70" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors truncate">{channel.name}</p>
                      {channel.category && <p className="text-xs text-gray-500 capitalize">{channel.category}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {!hasAccess && <Lock size={14} className="text-gray-500" />}
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500/15 rounded-full">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-xs font-bold text-red-400">LIVE</span>
                      </div>
                    </div>
                  </motion.button>
                );
              }

              if (selectedChannel?.id === channel.id && clickSource === 'grid') {
                return (
                  <div key={`player-${channel.id}`} className="col-span-full w-full mb-4 mt-2">
                    {renderPlayer()}
                  </div>
                );
              }

              return (
                <motion.div
                  key={channel.id}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="group cursor-pointer"
                  onClick={() => handleChannelClick(channel, 'grid')}
                >
                  <div className="relative overflow-hidden rounded-2xl bg-dark-800 aspect-[3/4] mb-2.5 shadow-md group-hover:shadow-xl group-hover:shadow-blue-900/30 transition-all duration-300 transform group-hover:scale-[1.03] group-hover:-translate-y-1">
                    {channel.thumbnailUrl ? (
                      <img
                        src={channel.thumbnailUrl}
                        alt={channel.name}
                        className="w-full h-full object-cover"
                        onError={e => { e.currentTarget.src = '/logo.png'; }}
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                        <Radio size={28} className="text-white/60" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* LIVE badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/90 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-bold text-white shadow-md">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      LIVE
                    </div>

                    {/* Lock */}
                    {!hasAccess && (
                      <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-2">
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                          <Lock size={18} className="text-white" />
                        </div>
                        <span className="text-xs text-white/80 font-semibold">Subscribe</span>
                      </div>
                    )}

                    {/* Play on hover */}
                    {hasAccess && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-600/40 ring-2 ring-white/15">
                          <Play size={20} className="text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-white/90 line-clamp-2 group-hover:text-blue-400 transition-colors px-0.5">
                    {channel.name}
                  </h3>
                  {channel.category && (
                    <p className="text-xs text-gray-500 capitalize mt-0.5 px-0.5">{channel.category}</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Maintenance channels */}
      {maintenanceChannels.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-2">
            <Wrench size={14} />
            Under Maintenance
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {maintenanceChannels.map((channel, i) => (
              <div key={channel.id} className="opacity-50 cursor-not-allowed">
                <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-dark-800 mb-2">
                  {channel.thumbnailUrl ? (
                    <img src={channel.thumbnailUrl} alt={channel.name} className="w-full h-full object-cover grayscale" />
                  ) : (
                    <div className="w-full h-full bg-dark-700 flex items-center justify-center">
                      <Wrench size={24} className="text-gray-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center">
                      <Wrench size={20} className="text-gray-400 mx-auto mb-1" />
                      <span className="text-xs text-gray-400 font-semibold">Maintenance</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 font-medium line-clamp-2 px-0.5">{channel.name}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {filteredChannels.length === 0 && (
        <div className="text-center py-20 bg-dark-800/40 rounded-3xl border border-dark-700/50">
          <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={24} className="text-gray-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-300 mb-2">No channels found</h3>
          <p className="text-gray-500 text-sm">Try adjusting your search or category filter.</p>
        </div>
      )}
    </div>
  );
}

export default function LiveTVPage() {
  return (
    <MainLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-64">
          <Loading size="lg" text="Loading Live TV..." variant="bar" />
        </div>
      }>
        <LiveTVContent />
      </Suspense>
    </MainLayout>
  );
}
