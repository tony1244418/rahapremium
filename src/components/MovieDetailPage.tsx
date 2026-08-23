'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Play, 
  Heart, 
  Share2, 
  Download, 
  Star, 
  Clock, 
  Calendar,
  Eye,
  ArrowLeft,
  Lock
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUserSubscriptionStatus, hasAccessToContent, hasPurchasedContent, isContentFree } from '@/lib/subscriptions';
import { getMovieById } from '@/lib/content';
import { Movie, SubscriptionPackage } from '@/types';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { UserBackButton } from '@/components/ui/BackButton';
import { GoogleDriveEmbedPlayer } from './GoogleDriveEmbedPlayer';
import { useRouter } from 'next/navigation';
import { VideoThumbnail } from './VideoThumbnail';
import { downloadVideoFromUrl, isDownloadableUrl, getBestDownloadUrl } from '@/lib/videoDownloadUtils';
import { FormattedText } from '@/components/ui/FormattedText';

interface MovieDetailPageProps {
  movieId: string;
}

export const MovieDetailPage: React.FC<MovieDetailPageProps> = ({ movieId }) => {
  const { t } = useLanguage();
  const { user, refreshUserData } = useAuth();
  const router = useRouter();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [freshContentAccesses, setFreshContentAccesses] = useState<string[]>(user?.contentAccesses || []);
  const [refreshing, setRefreshing] = useState(true); // wait for fresh DB check before showing access UI
  const searchParams = useSearchParams();
  const [autoPlay] = useState(searchParams.get('paid') === 'true');

  const subscriptionStatus = getUserSubscriptionStatus(user);
  const free = movie ? isContentFree(movie) : false;
  // If coming from payment page (?paid=true), treat as purchased regardless of stale user context
  const hasPurchased = autoPlay || (movie ? (freshContentAccesses.includes(movie.id) || (user?.contentAccesses || []).includes(movie.id)) : false);
  const isPerContentPurchase = !!(movie?.contentPurchaseEnabled) && !free && !hasPurchased;
  const hasAccess = autoPlay || free || hasPurchased || hasAccessToContent(user, movie?.requiredPackages || []);
  const hasContentAccess = autoPlay || free || hasPurchased || (!isPerContentPurchase && hasAccess);

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!movieId) {
          setError('No movie ID provided');
          return;
        }

        console.log('Fetching movie with ID:', movieId);
        const movieData = await getMovieById(movieId);
        
        if (movieData) {
          console.log('Movie loaded successfully:', movieData.title);
          console.log('[DEBUG] contentPurchaseEnabled:', movieData.contentPurchaseEnabled, '| contentPrice:', movieData.contentPrice, '| type:', typeof movieData.contentPurchaseEnabled);
          setMovie(movieData);
        } else {
          console.log('Movie not found for ID:', movieId);
          setError('Movie not found');
        }
      } catch (err) {
        console.error('Error fetching movie:', err);
        setError('Failed to load movie');
      } finally {
        setLoading(false);
      }
    };

    if (movieId) {
      fetchMovie();
    }
  }, [movieId]);

  // Refresh user data on mount once to pick up any post-payment access changes
  useEffect(() => {
    const refreshAndFetch = async () => {
      try {
        if (autoPlay) {
          // Coming from payment page — access already confirmed there, skip long refresh
          setRefreshing(false);
          return;
        }
        await refreshUserData();
        if (user?.uid) {
          const { supabase } = await import('@/lib/supabase');
          const { data } = await supabase
            .from('rahapremium_users')
            .select('content_accesses')
            .eq('id', user.uid)
            .single();
          if (data && (data as any).content_accesses) {
            setFreshContentAccesses((data as any).content_accesses);
          }
        }
      } finally {
        setRefreshing(false);
      }
    };
    refreshAndFetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-open player when arriving from payment and movie is ready
  useEffect(() => {
    if (autoPlay && movie && !refreshing) {
      setShowVideoPlayer(true);
    }
  }, [autoPlay, movie, refreshing]);

  const handlePlay = () => {
    if (isPerContentPurchase) {
      // Don't redirect to subscriptions — show buy prompt below
      return;
    }
    if (hasAccess) {
      setShowVideoPlayer(true);
    } else {
      // Redirect to subscriptions page if user doesn't have access
      router.push(`/subscriptions?redirect=${encodeURIComponent(`/movies/${movie?.id}`)}`);
    }
  };

  const handleDownload = async () => {
    if (!movie || !hasAccess) {
      setError('You need to subscribe to download this movie');
      return;
    }
    
    // If downloadUrl is provided (Bunny CDN direct link), open it in a new tab
    if (movie.downloadUrl) {
      console.log('[DOWNLOAD] Opening direct download URL in new tab:', movie.downloadUrl);
      window.open(movie.downloadUrl, '_blank');
      return;
    }
    
    // Fallback to videoUrl for other download methods
    const downloadUrl = movie.videoUrl || movie.googleDriveUrl || '';
    if (!downloadUrl) {
      setError('No video URL available for download');
      return;
    }
    
    // Check if URL is downloadable
    if (!isDownloadableUrl(downloadUrl)) {
      setError('This video cannot be downloaded directly. Please use the video player to watch it.');
      return;
    }
    
    setIsDownloading(true);
    setError(null); // Clear any previous errors
    
    try {
      // Try to get the best download URL (handles URL transformations for services like mediadelivery.net)
      const finalDownloadUrl = getBestDownloadUrl(downloadUrl) || downloadUrl;
      const filename = `${movie.title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
      
      console.log('[DOWNLOAD] Starting download:', {
        originalUrl: movie.videoUrl || movie.googleDriveUrl,
        finalDownloadUrl: finalDownloadUrl,
        filename: filename
      });
      
      // Use the download utility function which handles all edge cases
      await downloadVideoFromUrl(finalDownloadUrl, filename, true);
      
      console.log('[DOWNLOAD] Download completed successfully');
      setIsDownloading(false);
      // Success - download started, no error message needed
    } catch (error) {
      console.error('[DOWNLOAD] Download failed:', error);
      console.error('[DOWNLOAD] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      
      const errorMessage = error instanceof Error ? error.message : String(error) || 'Download failed. Please check your connection and try again.';
      
      // Provide more helpful error messages
      if (errorMessage.includes('HTTP 403') || errorMessage.includes('403')) {
        setError('Direct download is not available for this video. The CDN blocks direct downloads. Please use the video player to watch the video, or try right-clicking the video player and selecting "Save video as..." if available.');
      } else if (errorMessage.includes('HTTP 400') || errorMessage.includes('400')) {
        setError(`Download failed: ${errorMessage}. Please check if the download URL is correct and accessible.`);
      } else if (errorMessage.includes('CORS') || errorMessage.includes('cross-origin')) {
        setError('Download blocked by browser security. Please try opening the video link directly.');
      } else if (errorMessage.includes('not publicly accessible') || errorMessage.includes('not accessible')) {
        setError('The video file is not publicly accessible. Please contact support.');
      } else if (errorMessage.includes('not a video file') || errorMessage.includes('does not point to a video file')) {
        setError('The download link does not point to a video file. Please verify the download URL is correct.');
      } else if (errorMessage.includes('CDN_BLOCKED') || errorMessage.includes('mediadelivery.net')) {
        setError('Direct download is not available for this video type. Please use the video player to watch the video.');
      } else {
        setError(errorMessage || 'Download failed. Please check your connection and try again.');
      }
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: movie?.title,
          text: movie?.description,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback to copying URL to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading || refreshing) {
    return (
      <div className="container-mobile flex items-center justify-center min-h-96">
        <div className="relative">
          <div className="absolute inset-0 water-ripple"></div>
          <Loading size="lg" text="Loading movie..." variant="splash" />
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="container-mobile flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-dark-200 mb-2">
            {error || 'Movie not found'}
          </h3>
          <p className="text-dark-400 mb-4">
            {error || 'The movie you are looking for does not exist.'}
          </p>
          <UserBackButton />
        </div>
      </div>
    );
  }

  return (
    <div className="container-mobile space-y-6">
      {/* Back Button */}
      <UserBackButton />

      {/* Movie Header */}
      <div className="relative">
        {/* Movie Thumbnail - Auto-playing Video Preview */}
        <div className="aspect-video w-full rounded-lg overflow-hidden bg-dark-800">
          <VideoThumbnail
            videoUrl={movie.videoUrl || movie.googleDriveUrl || ''}
            thumbnailUrl={movie.thumbnailUrl}
              alt={movie.title}
              className="w-full h-full object-cover"
            fallbackIcon={<Play size={48} className="text-dark-500" />}
            />
          
          {/* Play Button Overlay */}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlay}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
                hasAccess 
                  ? 'bg-primary-500 hover:bg-primary-600 text-white' 
                  : 'bg-gray-500/80 hover:bg-gray-500 text-gray-200 backdrop-blur-sm'
              }`}
            >
              <Play size={32} className={!hasAccess ? "ml-1" : ""} />
            </motion.button>
          </div>

          {/* Access Status */}
          {/* Access Status Badge */}
          {!hasAccess && !isPerContentPurchase && (
            <div className="absolute top-4 right-4">
              <div className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-medium">
                Subscription Required
              </div>
            </div>
          )}
          {isPerContentPurchase && (
            <div className="absolute top-4 right-4">
              <div className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm font-medium">
                Purchase to Watch
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Movie Info */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100 mb-2">{movie.title}</h1>
          <FormattedText text={movie.description} className="text-dark-300 leading-relaxed" />
        </div>

        {/* Movie Stats */}
        <div className="flex flex-wrap gap-4 text-sm text-dark-400">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-400" />
            <span>{movie.rating || 0}/5</span>
          </div>
          {movie.duration && movie.duration > 0 && (
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{Math.floor(movie.duration / 60)}h {movie.duration % 60}m</span>
          </div>
          )}
          {movie.releaseDate && (
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{new Date(movie.releaseDate).getFullYear()}</span>
          </div>
          )}
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{movie.views.toLocaleString()} views</span>
          </div>
        </div>

        {/* Genres */}
        <div className="flex flex-wrap gap-2">
          {(movie.genre || []).map((g, idx) => (
            <span key={idx} className="bg-primary-500/20 text-primary-400 px-3 py-1 rounded-full text-sm">
              {g}
            </span>
          ))}
        </div>

        {/* Cast & Director */}
        <div className="space-y-2">
          <div>
            <span className="text-dark-400 text-sm">Director: </span>
            <span className="text-dark-200">{movie.director}</span>
          </div>
          {movie.cast && movie.cast.length > 0 && (
            <div>
              <span className="text-dark-400 text-sm">Cast: </span>
              <span className="text-dark-200">{(movie.cast || []).join(', ')}</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300 transition-colors"
                aria-label="Dismiss error"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            onClick={isPerContentPurchase ? undefined : (hasAccess ? handlePlay : () => router.push('/subscriptions'))}
            className={`flex-1 ${isPerContentPurchase ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary-500 hover:bg-primary-600'} text-white`}
          >
            <Play className="w-4 h-4 mr-2" />
            {isPerContentPurchase
              ? `Buy to Watch — TZS ${(movie.contentPrice || 0).toLocaleString()}`
              : hasAccess ? 'Play Movie' : 'Subscribe to Play'
            }
          </Button>
          
          {hasAccess && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1"
            >
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              variant="outline"
                className={`
                  w-full relative overflow-hidden
                  bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700
                  border-primary-500/50
                  text-white
                  shadow-lg shadow-primary-500/50
                  hover:shadow-xl hover:shadow-primary-500/70
                  hover:from-primary-400 hover:via-primary-500 hover:to-primary-600
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-300
                  ${isDownloading ? 'animate-pulse' : ''}
                `}
              >
                <div className="relative z-10 flex items-center justify-center">
              {isDownloading ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
                      <span>Downloading...</span>
                    </>
              ) : (
                    <>
                      <Download className="w-4 h-4 mr-2 transition-transform hover:translate-y-[-2px]" />
                      <span>Download</span>
                    </>
                  )}
                </div>
                {/* Shine effect */}
                {!isDownloading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 hover:animate-shimmer transition-opacity duration-500" />
                )}
                {/* Ripple effect when downloading */}
                {isDownloading && (
                  <motion.div
                    className="absolute inset-0 bg-white/20"
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
            </Button>
            </motion.div>
          )}
          
          <Button
            onClick={handleShare}
            variant="outline"
            className="flex-1"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Per-Content Purchase Panel */}
        {isPerContentPurchase && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-400 mb-1">Purchase Required</h4>
                <p className="text-amber-300 text-sm mb-1">
                  This content is available for a one-time purchase.
                </p>
                <p className="text-amber-200 text-lg font-bold mb-3">
                  TZS {(movie.contentPrice || 0).toLocaleString()}
                  <span className="text-sm font-normal ml-2 text-amber-300">/ {movie.contentPriceDays || 30} days</span>
                </p>
                <Button
                  onClick={() => router.push(`/pay?contentId=${movie.id}&type=movie`)}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Buy Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Required Message (only when NOT per-content purchase) */}
        {!hasAccess && !isPerContentPurchase && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-400 mb-1">Subscription Required</h4>
                <p className="text-yellow-300 text-sm mb-3">
                  You need a {(movie.requiredPackages || []).join(' or ')} subscription to watch this movie.
                </p>
                <Button
                  onClick={() => router.push('/subscriptions')}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  View Subscription Plans
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {showVideoPlayer && movie && (
        <GoogleDriveEmbedPlayer
          isOpen={showVideoPlayer}
          onClose={() => setShowVideoPlayer(false)}
          movie={{
            id: movie.id,
            title: movie.title,
            videoUrl: movie.videoUrl,
            downloadUrl: movie.downloadUrl,
            googleDriveUrl: movie.googleDriveUrl,
            thumbnailUrl: movie.thumbnailUrl
          }}
          contentType="movie"
        />
      )}
    </div>
  );
};
