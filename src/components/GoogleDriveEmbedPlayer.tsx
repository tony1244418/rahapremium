'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ExternalLink,
  AlertCircle,
  RotateCcw,
  Loader,
  Download,
  Maximize,
  Minimize
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { watchHistoryService } from '@/lib/userFeatures';
import { downloadVideo, isDownloadableUrl as checkDownloadableUrl, getBestDownloadUrl } from '@/lib/videoDownloadUtils';
import { incrementMovieViews } from '@/lib/content';

interface GoogleDriveEmbedPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  movie: {
    id: string;
    title: string;
    videoUrl?: string; // New generic video URL - Used for player
    downloadUrl?: string; // Direct download URL (e.g., Bunny CDN) - Used for downloads
    googleDriveUrl?: string; // Keep for backward compatibility
    thumbnailUrl?: string;
  };
  contentType?: 'movie' | 'series' | 'episode';
  seriesId?: string;
  episodeId?: string;
}

export const GoogleDriveEmbedPlayer: React.FC<GoogleDriveEmbedPlayerProps> = ({
  isOpen,
  onClose,
  movie,
  contentType = 'movie',
  seriesId,
  episodeId
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [watchStartTime, setWatchStartTime] = useState<Date | null>(null);
  const [lastProgressUpdate, setLastProgressUpdate] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressUpdateRef = useRef<NodeJS.Timeout | null>(null);

  // Get video URL - prioritize videoUrl, fallback to googleDriveUrl for backward compatibility
  const videoUrl = movie.videoUrl || movie.googleDriveUrl || '';

  // Get embed URL - use any URL directly in iframe (supports all iframe-embeddable URLs)
  const getEmbedUrl = () => {
    if (!videoUrl) return '';
    // Use the URL directly - iframe can handle any embeddable URL
    return videoUrl;
  };

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      
      // Auto-hide controls after 3 seconds
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
    
    // Increment views when video starts playing
    if (isOpen && movie.id) {
      if (contentType === 'movie') {
        incrementMovieViews(movie.id).catch(err => console.error('Error incrementing movie views:', err));
      } else if (contentType === 'series' && seriesId) {
        import('@/lib/content').then(({ incrementSeriesViews }) => {
          incrementSeriesViews(seriesId).catch((err: Error) => console.error('Error incrementing series views:', err));
        });
      } else if (contentType === 'episode' && episodeId) {
        import('@/lib/content').then(({ incrementEpisodeViews }) => {
          incrementEpisodeViews(episodeId).catch((err: Error) => console.error('Error incrementing episode views:', err));
        });
      }
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('Unable to load video. Please check if the video URL is accessible and supports embedding.');
  };

  const handleExternalOpen = () => {
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  };

  // Check if URL is downloadable (not an iframe-only URL)
  const isDownloadableUrl = (url: string): boolean => {
    return checkDownloadableUrl(url);
  };

  // Check if URL is an iframe-only URL that cannot be downloaded
  const isIframeOnlyUrl = (url: string): boolean => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    // mediadelivery.net can potentially be downloaded, so don't disable
    return (lowerUrl.includes('youtube.com') || 
           lowerUrl.includes('youtu.be') ||
           lowerUrl.includes('vimeo.com')) && 
           !lowerUrl.includes('mediadelivery.net');
  };


  const handleDownload = async () => {
    // Safety check: if already downloading, don't start again
    if (isDownloading) {
      console.warn('[DOWNLOAD DEBUG - GoogleDriveEmbedPlayer] Download already in progress, ignoring click');
      return;
    }
    
    // If downloadUrl is provided (Bunny CDN direct link), open it in a new tab
    if (movie.downloadUrl) {
      console.log('[DOWNLOAD DEBUG - GoogleDriveEmbedPlayer] Opening direct download URL in new tab:', movie.downloadUrl);
      window.open(movie.downloadUrl, '_blank');
      return;
    }
    
    // Fallback to videoUrl for other download methods
    const downloadUrlToUse = videoUrl;
    
    console.log('[DOWNLOAD DEBUG - GoogleDriveEmbedPlayer] Starting download process...');
    console.log('[DOWNLOAD DEBUG - GoogleDriveEmbedPlayer] Original videoUrl:', videoUrl);
    
    if (!downloadUrlToUse) {
      console.error('[DOWNLOAD DEBUG - GoogleDriveEmbedPlayer] No download URL available!');
      setError('No video URL available for download');
      return;
    }
    
    // Check if URL is downloadable before making API call
    const isDownloadable = checkDownloadableUrl(downloadUrlToUse);
    console.log('[DOWNLOAD DEBUG - GoogleDriveEmbedPlayer] Is URL downloadable?', isDownloadable);
    
    if (!isDownloadable) {
      // For iframe-only URLs that can't be downloaded, show error message
      console.log('[DOWNLOAD DEBUG - GoogleDriveEmbedPlayer] URL is not downloadable');
      setError('This video cannot be downloaded directly. Please use the video player to watch it.');
      return;
    }
    
    setIsDownloading(true);
    setError(null); // Clear any previous errors
    
    // Safety timeout: reset loading state after 30 seconds if still loading
    const timeoutId = setTimeout(() => {
      console.error('[DOWNLOAD DEBUG - GoogleDriveEmbedPlayer] Download timeout - resetting state');
      setIsDownloading(false);
      setError('Download timed out. Please try again.');
    }, 30000);
    
    try {
      // Try to get the best download URL (handles URL transformations for services like mediadelivery.net)
      const finalDownloadUrl = getBestDownloadUrl(downloadUrlToUse) || downloadUrlToUse;
      
      // Use the enhanced download utility
      console.log('[DOWNLOAD DEBUG - GoogleDriveEmbedPlayer] Using enhanced download utility:', finalDownloadUrl);
      await downloadVideo(finalDownloadUrl, `${movie.title}.mp4`, { 
        useApi: true,
        fallbackToDirect: true 
      });
      
      setIsDownloading(false);
      clearTimeout(timeoutId);
    } catch (error) {
      console.error('[DOWNLOAD DEBUG - GoogleDriveEmbedPlayer] Download failed with exception:', error);
      console.error('[DOWNLOAD DEBUG - GoogleDriveEmbedPlayer] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setIsDownloading(false);
      setError(error instanceof Error ? error.message : 'Download failed. Please check your connection and try again.');
      clearTimeout(timeoutId);
    }
  };

  // Watch history tracking functions
  const startWatchTracking = () => {
    if (user) {
      setWatchStartTime(new Date());
      // Start periodic progress updates (every 30 seconds)
      progressUpdateRef.current = setInterval(() => {
        updateWatchProgress();
      }, 30000);

      // Also create initial watch history entry immediately
      updateWatchProgress();
    }
  };

  const updateWatchProgress = async () => {
    if (!user || !watchStartTime) return;

    try {
      // For iframe videos, we can't get exact progress, so we estimate based on time watched
      const now = new Date();
      const watchedSeconds = (now.getTime() - watchStartTime.getTime()) / 1000;

      // Estimate progress (assuming average movie is 2 hours)
      const estimatedDuration = 7200; // 2 hours in seconds
      const progress = Math.min((watchedSeconds / estimatedDuration) * 100, 95); // Cap at 95% for estimation

      // Update more frequently for better tracking (every 1% or minimum 30 seconds)
      if (progress > lastProgressUpdate + 1 || watchedSeconds >= 30) {
        const historyData: any = {
          userId: user.phoneNumber,
          movieId: movie.id,
          progress: progress,
          duration: estimatedDuration,
          completed: progress >= 90, // Consider 90%+ as completed
          lastPosition: watchedSeconds
        };

        // Set content type as movie
        historyData.contentType = 'movie';

        await watchHistoryService.updateWatchHistory(historyData);
        setLastProgressUpdate(progress);
      }
    } catch (error) {
      // Silently handle watch progress errors
    }
  };

  const stopWatchTracking = () => {
    if (progressUpdateRef.current) {
      clearInterval(progressUpdateRef.current);
    }
    // Final progress update when closing
    updateWatchProgress();
  };

  // Start tracking when video loads
  useEffect(() => {
    if (!isLoading && !error && isOpen) {
      startWatchTracking();
    }

    return () => {
      stopWatchTracking();
    };
  }, [isLoading, error, isOpen, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressUpdateRef.current) {
        clearInterval(progressUpdateRef.current);
      }
    };
  }, []);

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
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

  const handleClose = () => {
    onClose();
  };

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        onClick={handleClose}
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
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80">
              <div className="text-center text-white">
                <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-primary-400" />
                <p className="text-lg font-medium">Loading video...</p>
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
                <h3 className="text-xl font-semibold mb-2">Video Loading Failed</h3>
                <p className="text-gray-300 mb-6">{error}</p>
                
                <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-6 text-left">
                  <h4 className="text-blue-400 font-medium mb-2">Solutions:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Open the video directly in a new tab</li>
                    <li>• Check if the video URL is accessible</li>
                    <li>• Ensure the video supports embedding</li>
                    <li>• Try using a different browser or incognito mode</li>
                    <li>• Refresh the page and try again</li>
                  </ul>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleRetry}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Try Again
                  </button>
                  
                  <button
                    onClick={handleExternalOpen}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Video
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Video Iframe - Optimized for mobile */}
          {!error && (
            <div className="relative w-full h-full">
              <iframe
                src={getEmbedUrl()}
                className="w-full h-full"
                frameBorder="0"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title={movie.title}
                style={{
                  // Mobile optimizations
                  touchAction: 'manipulation',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none'
                }}
              />
            </div>
          )}

          {/* Top Bar - Always Visible (Download Button and Close Button) */}
          {!error && (
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-2 sm:p-4 pointer-events-auto z-20">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm sm:text-xl font-bold text-white truncate">{movie.title}</h2>
                      <p className="text-xs sm:text-sm text-gray-300">Video Player</p>
                    </div>
                <div className="flex items-center gap-2">
                  {/* Download Button - Always Visible */}
                  {!isIframeOnlyUrl(videoUrl) ? (
                      <motion.button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative group"
                        title="Download Video"
                      >
                        <div className={`
                          relative p-2.5 sm:p-3 rounded-lg
                          bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700
                          shadow-lg shadow-primary-500/50
                          backdrop-blur-sm
                          transition-all duration-300
                          ${isDownloading 
                            ? 'animate-pulse cursor-wait' 
                            : 'hover:shadow-xl hover:shadow-primary-500/70 hover:from-primary-400 hover:via-primary-500 hover:to-primary-600'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                          touch-manipulation
                        `}>
                          {/* Shine effect */}
                          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer transition-opacity duration-500" />
                          
                          {/* Icon */}
                          <div className="relative z-10 text-white">
                            {isDownloading ? (
                              <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-y-[-2px]" />
                            )}
                          </div>
                          
                          {/* Ripple effect on click */}
                          {isDownloading && (
                            <motion.div
                              className="absolute inset-0 rounded-lg bg-white/30"
                              initial={{ scale: 0, opacity: 0.8 }}
                              animate={{ scale: 1.5, opacity: 0 }}
                              transition={{ duration: 1, repeat: Infinity }}
                            />
                          )}
                        </div>
                      </motion.button>
                  ) : (
                    <button
                      disabled
                      className="relative p-2.5 sm:p-3 rounded-lg bg-gray-700/50 text-gray-400 cursor-not-allowed touch-manipulation opacity-60"
                      title="Download not available for this video type. Please use the video player controls or open in a new tab."
                    >
                      <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}
                  <button
                    onClick={handleClose}
                    className="p-1 sm:p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors ml-2"
                  >
                    <X className="w-4 h-4 sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Controls Overlay - Mobile Optimized */}
          <AnimatePresence>
            {showControls && !error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 pointer-events-none"
              >

                {/* Bottom Controls - Mobile Optimized */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-4 pointer-events-auto">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                      {/* Keyboard Shortcuts Hint - Mobile */}
                      <div className="text-xs text-gray-400 hidden sm:block">
                        <span className="hidden md:inline">Click video for controls • </span>
                        <span>Space: Play/Pause • F: Fullscreen</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                      {/* External Link - Mobile Friendly */}
                      <button
                        onClick={handleExternalOpen}
                        className="p-2 text-white hover:text-primary-400 transition-colors touch-manipulation"
                        title="Open Video"
                      >
                        <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>

                      {/* Fullscreen - Mobile Friendly */}
                      <button
                        onClick={toggleFullscreen}
                        className="p-2 text-white hover:text-primary-400 transition-colors touch-manipulation"
                        title="Fullscreen"
                      >
                        {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </button>
                    </div>
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
