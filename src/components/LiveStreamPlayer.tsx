'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Maximize,
  Minimize,
  AlertCircle,
  RotateCcw,
  Loader,
  Radio
} from 'lucide-react';
import { LiveChannel } from '@/types';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';

interface LiveStreamPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  channel: LiveChannel;
}

export const LiveStreamPlayer: React.FC<LiveStreamPlayerProps> = ({
  isOpen,
  onClose,
  channel
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<any>(null);
  const shakaRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [useIframe, setUseIframe] = useState(false);
  const [isTokenReady, setIsTokenReady] = useState(false);
  const latestCdnTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Fetch token once when player opens
    const fetchToken = async () => {
      try {
        const response = await fetch(`/api/cdn-token?t=${Date.now()}`, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          latestCdnTokenRef.current = data?.token || '';
        }
      } catch (err) {
        console.error('Error fetching CDN token:', err);
        latestCdnTokenRef.current = '';
      }
      setIsTokenReady(true);
    };

    setIsTokenReady(false);
    fetchToken();
  }, [isOpen]);


  // Hide bottom navigation when live TV is playing
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('live-tv-playing');
    } else {
      document.body.classList.remove('live-tv-playing');
    }
    
    return () => {
      document.body.classList.remove('live-tv-playing');
    };
  }, [isOpen]);

  // Auto-hide controls
  useEffect(() => {
    if (isOpen) {
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, showControls]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  // Initialize video player based on stream format
  useEffect(() => {
    if (!isOpen || !videoRef.current) return;
    if (!isTokenReady) return; // Wait until token resolves

    const video = videoRef.current;
    // For DASH/clearkey streams, we handle the token in the DASH section directly.
    // For HLS, append the CDN token now.
    const isDashStream = channel.streamFormat === 'dash' || channel.streamUrl.includes('.mpd');
    let streamUrl = channel.streamUrl;
    const currentToken = latestCdnTokenRef.current;
    if (currentToken && !isDashStream) {
      const separator = streamUrl.includes('?') ? '&' : '?';
      if (!streamUrl.includes('token=') && !streamUrl.includes('cdntoken=')) {
        streamUrl = `${streamUrl}${separator}cdntoken=${currentToken}`;
      }
    }

    const format = channel.streamFormat || 'other';

    setIsLoading(true);
    setError(null);

    // Clean up previous instances
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (dashRef.current) {
      dashRef.current.reset();
      dashRef.current = null;
    }
    if (shakaRef.current) {
      shakaRef.current.destroy();
      shakaRef.current = null;
    }
    setUseIframe(false);

    const loadStream = async () => {
      try {
        // Define custom loader for hls.js to append the latest token dynamically
        // Must be a class (not a plain function) so TypeScript can type `this` correctly
        class CdnTokenLoader {
          loader: any;
          constructor(config: any) {
            this.loader = new Hls.DefaultConfig.loader(config);
          }
          abort() { this.loader.abort(); }
          destroy() { this.loader.destroy(); }
          load(context: any, config: any, callbacks: any) {
            if (latestCdnTokenRef.current) {
              try {
                const urlObj = new URL(context.url);
                urlObj.searchParams.set('cdntoken', latestCdnTokenRef.current);
                context.url = urlObj.toString();
              } catch (e) {}
            }
            this.loader.load(context, config, callbacks);
          }
          get stats() { return this.loader.stats; }
          get context() { return this.loader.context; }
        }

        const customLoader = CdnTokenLoader;


        // Check for PHP script URLs or URLs with custom ports that might return streams
        const isPhpScript = streamUrl.includes('/live.php') || streamUrl.includes('/play/live.php') || streamUrl.includes('extension=ts') || streamUrl.includes('extension=m3u8');
        const hasCustomPort = /:\d{4,5}\//.test(streamUrl) || /:\d{4,5}$/.test(streamUrl);
        const isTsStream = streamUrl.includes('.ts') || streamUrl.includes('extension=ts');
        const isHttp = streamUrl.startsWith('http://'); // HTTP URLs (not HTTPS)
        
        // For HTTP URLs on HTTPS pages, use proxy API to avoid mixed content blocking
        // Check if we're on HTTPS
        const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
        
        if (isHttp && isHttpsPage) {
          // Use proxy API for HTTP URLs on HTTPS pages
          const proxyUrl = `/api/proxy-stream?url=${encodeURIComponent(streamUrl)}`;
          console.log('HTTP URL on HTTPS page detected, using proxy:', proxyUrl);
          
          // Try HLS with proxy URL first
          if (format === 'hls' || streamUrl.includes('.m3u8') || isTsStream || (isPhpScript && streamUrl.includes('extension=ts'))) {
            if (Hls.isSupported()) {
              const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                maxBufferSize: 60 * 1000 * 1000,
                maxBufferHole: 0.5,
                highBufferWatchdogPeriod: 2,
                nudgeOffset: 0.1,
                nudgeMaxRetry: 3,
                fragLoadingTimeOut: 20000,
                manifestLoadingTimeOut: 10000,
                levelLoadingTimeOut: 10000,
                pLoader: customLoader as any,
                fLoader: customLoader as any,
                xhrSetup: (xhr, url) => {
                  xhr.withCredentials = false;
                }
              });

              hls.loadSource(proxyUrl);
              hls.attachMedia(video);

              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setIsLoading(false);
                setIsPlaying(true);
                video.play().catch(err => {
                  console.error('Auto-play failed:', err);
                  setError('Please click play to start the stream');
                });
              });

              hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS error:', data);
                if (data.fatal) {
                  switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                      console.log('Fatal network error, trying to recover...');
                      hls.startLoad();
                      break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                      console.log('Fatal media error, trying to recover...');
                      hls.recoverMediaError();
                      break;
                    default:
                      console.log('Fatal error, checking if response is HTML (embedded player)...');
                      hls.destroy();
                      // Check if the URL might return HTML (embedded player) instead of stream
                      // For PHP scripts, try iframe as fallback
                      if (isPhpScript) {
                        console.log('PHP script detected, trying iframe instead...');
                        setUseIframe(true);
                        setIsLoading(false);
                        setIsPlaying(true);
                      } else {
                        // Fallback to direct video with proxy
                        video.src = proxyUrl;
                        video.load();
                      }
                      break;
                  }
                }
              });

              hlsRef.current = hls;
              return;
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              // Native HLS support (Safari) with proxy
              video.src = proxyUrl;
              video.addEventListener('loadedmetadata', () => {
                setIsLoading(false);
                setIsPlaying(true);
                video.play().catch(err => {
                  console.error('Auto-play failed:', err);
                  setError('Please click play to start the stream');
                });
              });
              video.addEventListener('error', () => {
                // If proxy fails and it's a PHP script, try iframe
                if (isPhpScript) {
                  console.log('Proxy failed for PHP script, trying iframe...');
                  setUseIframe(true);
                  setIsLoading(false);
                  setIsPlaying(true);
                } else {
                  setError('Failed to load stream via proxy. Please check the stream URL.');
                  setIsLoading(false);
                }
              });
              return;
            }
          }
          
          // For non-HLS HTTP streams, try proxy first, then iframe for PHP scripts
          if (isPhpScript) {
            // PHP scripts often return HTML embedded players, use iframe directly
            console.log('PHP script detected, using iframe for embedded player');
            setUseIframe(true);
            setIsLoading(false);
            setIsPlaying(true);
          } else {
            // Try proxy for direct streams
            video.src = proxyUrl;
            video.addEventListener('loadedmetadata', () => {
              setIsLoading(false);
              setIsPlaying(true);
              video.play().catch(err => {
                console.error('Auto-play failed:', err);
                setError('Please click play to start the stream');
              });
            });
            video.addEventListener('error', () => {
              setError('Failed to load stream via proxy. Please check the stream URL.');
              setIsLoading(false);
            });
          }
          return;
        }
        
        // For HTTP URLs on HTTP pages, use iframe to avoid mixed content issues
        if (isHttp && (isPhpScript || hasCustomPort)) {
          console.log('HTTP URL detected, using iframe to avoid mixed content issues');
          setUseIframe(true);
          setIsLoading(false);
          setIsPlaying(true);
          return;
        }
        
        if (format === 'hls' || streamUrl.includes('.m3u8') || isTsStream || (isPhpScript && streamUrl.includes('extension=ts'))) {
          // HLS stream (including TS streams which are handled as HLS)
          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 90,
              maxBufferLength: 30,
              maxMaxBufferLength: 60,
              maxBufferSize: 60 * 1000 * 1000,
              maxBufferHole: 0.5,
              highBufferWatchdogPeriod: 2,
              nudgeOffset: 0.1,
              nudgeMaxRetry: 3,
              fragLoadingTimeOut: 20000,
              manifestLoadingTimeOut: 10000,
              levelLoadingTimeOut: 10000,
              pLoader: customLoader as any,
              fLoader: customLoader as any,
              // Add CORS and credentials support for PHP scripts and HTTP URLs
              xhrSetup: (xhr, url) => {
                xhr.withCredentials = false;
                // For HTTP URLs, try to handle CORS
                if (url.startsWith('http://')) {
                  xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
                }
              }
            });

            hls.loadSource(streamUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setIsLoading(false);
              setIsPlaying(true);
              video.play().catch(err => {
                console.error('Auto-play failed:', err);
                setError('Please click play to start the stream');
              });
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
              console.error('HLS error:', data);
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    console.log('Fatal network error, trying to recover...');
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    console.log('Fatal media error, trying to recover...');
                    hls.recoverMediaError();
                    break;
                  default:
                    console.log('Fatal error, trying iframe fallback...');
                    hls.destroy();
                    // For PHP scripts, HTTP URLs, or custom ports, try iframe as fallback
                    if (isPhpScript || hasCustomPort || isHttp) {
                      console.log('Falling back to iframe for:', streamUrl);
                      setUseIframe(true);
                      setIsLoading(false);
                      setIsPlaying(true);
                    } else {
                      setError('Failed to load stream. Please check the stream URL.');
                      setIsLoading(false);
                    }
                    break;
                }
              }
            });

            hlsRef.current = hls;
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = streamUrl;
            video.addEventListener('loadedmetadata', () => {
              setIsLoading(false);
              setIsPlaying(true);
              video.play().catch(err => {
                console.error('Auto-play failed:', err);
                setError('Please click play to start the stream');
              });
            });
            video.addEventListener('error', () => {
              // Fallback to iframe for PHP scripts, HTTP URLs, or custom ports
              if (isPhpScript || hasCustomPort || isHttp) {
                console.log('Native HLS failed, falling back to iframe');
                setUseIframe(true);
                setIsLoading(false);
                setIsPlaying(true);
              } else {
                setError('HLS is not supported in this browser');
                setIsLoading(false);
              }
            });
          } else {
            // HLS not supported - try iframe for PHP scripts, HTTP URLs, or custom ports
            if (isPhpScript || hasCustomPort || isHttp) {
              console.log('HLS not supported, using iframe for:', streamUrl);
              setUseIframe(true);
              setIsLoading(false);
              setIsPlaying(true);
            } else {
              setError('HLS is not supported in this browser');
              setIsLoading(false);
            }
          }
        } else if (format === 'dash' || streamUrl.includes('.mpd')) {
          // DASH stream
          // For ClearKey streams: use Shaka Player, load DIRECTLY from CDN (no proxy)
          // This matches the working HTML snippet exactly.

          let parsedClearKeys = channel.clearKeys;
          if (typeof parsedClearKeys === 'string') {
            try {
              parsedClearKeys = JSON.parse(parsedClearKeys);
            } catch (e) {
              console.error('Failed to parse clearKeys:', e);
              parsedClearKeys = {};
            }
          }

            if (channel.encryptionType === 'clearkey' && parsedClearKeys && Object.keys(parsedClearKeys).length > 0) {
              // Build the manifest URL with cdntoken appended — exactly like the HTML snippet:
              let manifestUrl = channel.streamUrl; // always use the raw URL from channel
              const currentToken = latestCdnTokenRef.current;
              if (currentToken) {
                const sep = manifestUrl.includes('?') ? '&' : '?';
                if (!manifestUrl.includes('cdntoken=') && !manifestUrl.includes('token=')) {
                  manifestUrl = `${manifestUrl}${sep}cdntoken=${currentToken}`;
                }
              }

            // Use Shaka Player for ClearKey — dynamically imported to avoid Next.js SSR issues
            try {
              const shakaModule = await import('shaka-player');
              const shaka = (shakaModule as any).default ?? shakaModule;

              // Install polyfills — matches: shaka.polyfill.installAll()
              shaka.polyfill.installAll();

              if (!shaka.Player.isBrowserSupported()) {
                throw new Error('Shaka Player is not supported in this browser');
              }

              const shakaPlayer = new shaka.Player();
              await shakaPlayer.attach(video);

              // Configure DRM — matches: player.configure({ drm: { clearKeys: clearKeys } })
              shakaPlayer.configure({
                drm: {
                  clearKeys: parsedClearKeys
                }
              });

              // Add request filter to append the latest CDN token dynamically
              shakaPlayer.getNetworkingEngine().registerRequestFilter((type: any, request: any) => {
                if (latestCdnTokenRef.current && request.uris && request.uris[0]) {
                  try {
                    const urlObj = new URL(request.uris[0]);
                    urlObj.searchParams.set('cdntoken', latestCdnTokenRef.current);
                    request.uris[0] = urlObj.toString();
                  } catch (e) {}
                }
              });

              // NO proxy — load directly from CDN
              // Matches: await player.load(manifestUri)
              const finalStreamUrl = manifestUrl;

              // Listen for player errors
              shakaPlayer.addEventListener('error', (event: any) => {
                const err = event.detail;
                console.error('Shaka Player error event:', {
                  code: err.code,
                  category: err.category,
                  severity: err.severity,
                  message: err.message,
                  data: err.data
                });
              });

              // Load manifest — matches: await player.load(manifestUri)
              shakaPlayer.load(finalStreamUrl).then(() => {
                console.log('ClearKey DASH stream loaded successfully via Shaka Player');
                setIsLoading(false);
                setIsPlaying(true);
                video.play().catch((playErr: any) => {
                  console.error('Auto-play failed:', playErr);
                  setError('Click play to start the stream');
                });
              }).catch((loadErr: any) => {
                console.error('Shaka load error:', loadErr);
                const code = loadErr?.code;
                let msg = 'Failed to load encrypted DASH stream. ';
                if (code === 1001 || code === 1002) {
                  msg += 'Network error — check if the stream URL is accessible and has CORS enabled.';
                } else if (code === 4000 || code === 4001) {
                  msg += 'Manifest error — the stream URL may be incorrect or the format is not supported.';
                } else if (code === 6007) {
                  msg += 'DRM error — please verify your KID and Key values are correct (32 hex chars each).';
                } else {
                  msg += `Error code ${code ?? 'unknown'}: ${loadErr?.message || 'Unknown error'}. Check stream URL and DRM keys.`;
                }
                setError(msg);
                setIsLoading(false);
              });

              shakaRef.current = shakaPlayer;
            } catch (err) {
              console.error('Error initializing Shaka Player:', err);
              setError('Failed to initialize Shaka Player. Please check browser support.');
              setIsLoading(false);
            }
          } else {
            // Use dashjs for regular (non-encrypted) DASH streams
            const dashPlayer = dashjs.MediaPlayer().create();
            
            dashPlayer.extend('RequestModifier', function () {
              return {
                modifyRequestURL: function (url: string) {
                  if (latestCdnTokenRef.current) {
                    try {
                      const urlObj = new URL(url);
                      urlObj.searchParams.set('cdntoken', latestCdnTokenRef.current);
                      return urlObj.toString();
                    } catch(e) { return url; }
                  }
                  return url;
                }
              };
            }, true);
            
            dashPlayer.initialize(video, streamUrl, true);
            
            dashPlayer.on('streamInitialized', () => {
              setIsLoading(false);
              setIsPlaying(true);
              video.play().catch(err => {
                console.error('Auto-play failed:', err);
                setError('Please click play to start the stream');
              });
            });

            dashPlayer.on('error', (e: any) => {
              console.error('DASH error:', e);
              // Fallback to iframe for PHP scripts, HTTP URLs, or custom ports
              if (isPhpScript || hasCustomPort || isHttp) {
                console.log('DASH failed, falling back to iframe');
                setUseIframe(true);
                setIsLoading(false);
                setIsPlaying(true);
              } else {
                setError('Failed to load DASH stream. Please check the stream URL.');
                setIsLoading(false);
              }
            });

            dashRef.current = dashPlayer;
          }
        } else if (format === 'youtube' || streamUrl.includes('youtube.com') || streamUrl.includes('youtu.be') || streamUrl.includes('googleusercontent.com')) {
          // YouTube or Google CDN - use iframe
          setUseIframe(true);
          setIsLoading(false);
          setIsPlaying(true);
        } else if (isPhpScript || hasCustomPort || isHttp) {
          // PHP script URLs, HTTP URLs, or URLs with custom ports - use iframe
          // HTTP URLs on HTTPS pages need iframe to avoid mixed content blocking
          // Many PHP scripts return embedded players or streams that work better in iframes
          console.log('Using iframe for:', streamUrl);
          setUseIframe(true);
          setIsLoading(false);
          setIsPlaying(true);
        } else {
          // Direct MP4 or other formats
          video.src = streamUrl;
          video.addEventListener('loadedmetadata', () => {
            setIsLoading(false);
            setIsPlaying(true);
            video.play().catch(err => {
              console.error('Auto-play failed:', err);
              setError('Please click play to start the stream');
            });
          });
        }

        video.addEventListener('error', (e) => {
          console.error('Video error:', e);
          // For PHP scripts, HTTP URLs, or custom port URLs, try iframe as fallback
          if (isPhpScript || hasCustomPort || isHttp) {
            console.log('Video failed, trying iframe fallback for:', streamUrl);
            setUseIframe(true);
            setIsLoading(false);
            setIsPlaying(true);
          } else {
            setError('Failed to load video stream. Please check the stream URL.');
            setIsLoading(false);
          }
        });

        video.addEventListener('play', () => setIsPlaying(true));
        video.addEventListener('pause', () => setIsPlaying(false));
        video.addEventListener('waiting', () => setIsLoading(true));
        video.addEventListener('playing', () => setIsLoading(false));

      } catch (err) {
        console.error('Error loading stream:', err);
        setError('Failed to load stream. Please try again.');
        setIsLoading(false);
      }
    };

    loadStream();

    // Cleanup on unmount
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (dashRef.current) {
        dashRef.current.reset();
        dashRef.current = null;
      }
      if (shakaRef.current) {
        shakaRef.current.destroy();
        shakaRef.current = null;
      }
      if (video) {
        video.pause();
        video.src = '';
      }
      setUseIframe(false);
    };
  }, [isOpen, channel.streamUrl, channel.streamFormat, channel.encryptionType, channel.clearKeys, isTokenReady]);

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        onClick={onClose}
        onMouseMove={handleMouseMove}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full h-full bg-black"
          onClick={(e) => e.stopPropagation()}
          ref={containerRef}
        >
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/90 backdrop-blur-sm">
              <div className="text-center text-white relative">
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping"></div>
                  <div className="absolute inset-2 rounded-full border-4 border-red-400/50 animate-pulse"></div>
                  <div className="absolute inset-4 rounded-full border-4 border-transparent border-t-red-400 border-r-red-500 animate-spin" style={{ animationDuration: '1s' }}></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Radio className="w-8 h-8 sm:w-12 sm:h-12 text-red-500" />
                  </div>
                </div>
                <p className="mt-6 text-sm sm:text-base font-medium text-red-400 animate-pulse">
                  Loading live stream...
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/90">
              <div className="text-center text-white max-w-lg mx-4">
                <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Stream Loading Failed</h3>
                <p className="text-gray-300 mb-2">{error}</p>
                {channel.streamUrl.startsWith('http://') && (
                  <p className="text-yellow-400 text-sm mb-4">
                    ⚠️ HTTP URLs may be blocked by browsers on HTTPS pages (mixed content). 
                    Try accessing the site over HTTP or contact support.
                  </p>
                )}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleRetry}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Try Again
                  </button>
                  {channel.streamUrl.startsWith('http://') && (
                    <button
                      onClick={() => window.open(channel.streamUrl, '_blank')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      Open in New Tab
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Video Player */}
          {!error && (
            <div className="relative w-full h-full">
              {useIframe ? (
                <div ref={iframeContainerRef} className="relative w-full h-full">
                  <iframe
                    src={((): string => {
                      const streamUrl = channel.streamUrl;
                      // YouTube URL handling
                      if (streamUrl.includes('youtube.com/watch?v=')) {
                        const videoId = streamUrl.split('v=')[1]?.split('&')[0];
                        if (videoId) {
                          return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                        }
                      } else if (streamUrl.includes('youtu.be/')) {
                        const videoId = streamUrl.split('youtu.be/')[1]?.split('?')[0];
                        if (videoId) {
                          return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                        }
                      }
                      // For PHP scripts and other URLs, use the URL directly
                      // PHP scripts like live.php typically return embedded players or streams
                      return streamUrl;
                    })()}
                    className="w-full h-full border-0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    onLoad={() => {
                      setIsLoading(false);
                      setIsPlaying(true);
                    }}
                    onError={() => {
                      // If iframe fails, try direct video as fallback
                      console.log('Iframe failed, trying direct video...');
                      setUseIframe(false);
                      if (videoRef.current) {
                        videoRef.current.src = channel.streamUrl;
                        videoRef.current.load();
                      }
                    }}
                    title={channel.name}
                  />
                </div>
              ) : (
                <video
                  ref={videoRef}
                  className="w-full h-full"
                  playsInline
                  controls={false}
                  onClick={togglePlayPause}
                />
              )}
            </div>
          )}

          {/* Top Bar */}
          {!error && (
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 pointer-events-auto z-20">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-500 rounded-full animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span className="text-xs font-bold text-white">LIVE</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white truncate">{channel.name}</h2>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300">Live TV Channel</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors ml-2 flex-shrink-0"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>
          )}

          {/* Controls Overlay */}
          <AnimatePresence>
            {showControls && !error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 pointer-events-none"
              >
                {/* Bottom Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4 pointer-events-auto">
                  <div className="flex items-center justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={togglePlayPause}
                        className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                      >
                        {isPlaying ? (
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                      <button
                        onClick={toggleFullscreen}
                        className="p-2 text-white hover:text-red-400 transition-colors"
                        title="Fullscreen (F)"
                      >
                        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-400 mt-2 text-center">
                    Tap video to play/pause • F: Fullscreen • Space: Play/Pause
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

