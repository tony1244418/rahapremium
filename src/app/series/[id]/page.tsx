'use client';

import React, { useState, useEffect, use } from 'react';
import MainLayout from '@/components/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Tv, Play, Star, Clock, Users, ArrowLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSeriesById } from '@/lib/content';
import { Series, Season, Episode } from '@/types';
import Link from 'next/link';
import { Loading } from '@/components/ui/Loading';
import { useRouter, useSearchParams } from 'next/navigation';
import { checkContentAccess } from '@/lib/content';
import { hasPurchasedContent, isContentFree } from '@/lib/subscriptions';
import { UniversalVideoPlayer } from '@/components/UniversalVideoPlayer';
import { formatDuration } from '@/lib/content-management';
import { FormattedText } from '@/components/ui/FormattedText';

export default function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useLanguage();
  const { user, refreshUserData } = useAuth();
  const router = useRouter();
  const [series, setSeries] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [isSeasonVideo, setIsSeasonVideo] = useState(false);
  const [freshContentAccesses, setFreshContentAccesses] = useState<string[]>(user?.contentAccesses || []);
  const [refreshing, setRefreshing] = useState(true); // wait for fresh DB check before showing access UI
  
  const searchParams = useSearchParams();
  const [autoPlay] = useState(searchParams.get('paid') === 'true');

  // Unwrap params
  const resolvedParams = use(params);

  // Load series data
  useEffect(() => {
    const loadSeries = async () => {
      try {
        setLoading(true);
        const seriesData = await getSeriesById(resolvedParams.id);
        
        if (!seriesData) {
          setError('Series not found');
          return;
        }

        setSeries(seriesData);
      } catch (err) {
        console.error('Error loading series:', err);
        setError('Failed to load series');
      } finally {
        setLoading(false);
      }
    };

    loadSeries();
  }, [resolvedParams.id]);

  // Refresh user data on mount to pick up any post-payment access changes
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
        setRefreshing(false); // done — now render with fresh data
      }
    };
    refreshAndFetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSeasonExpansion = (seasonId: string) => {
    setExpandedSeasons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seasonId)) {
        newSet.delete(seasonId);
      } else {
        newSet.add(seasonId);
      }
      return newSet;
    });
  };

  const handleEpisodePlay = (episode: Episode) => {
    const episodeAny = episode as any;
    const alreadyPurchased = autoPlay || hasPurchasedContent(user, episode.id) || freshContentAccesses.includes(episode.id) || (series && freshContentAccesses.includes(series.id));
    const free = isContentFree(episodeAny) || (episode.requiredPackages || []).length === 0;

    // If already purchased or free, play directly
    if (alreadyPurchased || free) {
      setIsSeasonVideo(false);
      setSelectedEpisode(episode);
      return;
    }

    // If episode has per-content purchase enabled, redirect to buy page
    if (episodeAny.contentPurchaseEnabled) {
      router.push(`/pay?contentId=${episode.id}&type=episode`);
      return;
    }

    // Check if user has access to this content via subscription
    const accessCheck = checkContentAccess(user, episode.requiredPackages);
    if (!accessCheck) {
      router.push(`/subscriptions?redirect=${encodeURIComponent(`/series/${series?.id}`)}`);
      return;
    }

    setIsSeasonVideo(false);
    setSelectedEpisode(episode);
  };

  const handleSeasonPlay = (season: Season) => {
    const videoUrl = season.videoUrl || season.googleDriveUrl;
    if (videoUrl) {
      const alreadyPurchased = autoPlay || (series ? (hasPurchasedContent(user, series.id) || freshContentAccesses.includes(series.id)) : false);
      const free = isContentFree(series as any) || (!series?.requiredPackages?.length && !series?.contentPurchaseEnabled);

      // If already purchased or free, play directly
      if (!alreadyPurchased && !free) {
        // If series has per-content purchase enabled, redirect to buy page
        if (series?.contentPurchaseEnabled) {
          router.push(`/pay?contentId=${series.id}&type=series`);
          return;
        }
        // Check if user has access to this content via subscription
        const accessCheck = checkContentAccess(user, series?.requiredPackages || []);
        if (!accessCheck) {
          router.push(`/subscriptions?redirect=${encodeURIComponent(`/series/${series?.id}`)}`);
          return;
        }
      }

      // Create a temporary episode object for the season
      const seasonEpisode: Episode = {
        id: season.id,
        seriesId: season.seriesId,
        seasonId: season.id,
        episodeNumber: 1,
        title: season.title,
        description: season.description,
        videoUrl: season.videoUrl,
        downloadUrl: season.downloadUrl,
        googleDriveUrl: season.googleDriveUrl,
        thumbnailUrl: season.thumbnailUrl || '',
        duration: 0,
        quality: ['HD'],
        requiredPackages: series?.requiredPackages || [],
        isAdult: series?.isAdult || false,
        createdAt: season.createdAt,
        updatedAt: season.updatedAt,
        views: 0
      };

      setIsSeasonVideo(true);
      setSelectedEpisode(seasonEpisode);
    } else if (season.episodes && season.episodes.length > 0) {
      // Play first episode of the season
      setIsSeasonVideo(false);
      handleEpisodePlay(season.episodes[0]);
    }
  };

  // Auto-open the player immediately when arriving from a successful payment
  // (?paid=true), matching the movies/adult behaviour. Without this the user
  // would land on the series detail screen instead of the content opening.
  useEffect(() => {
    if (!autoPlay || refreshing || !series || selectedEpisode) return;
    if (series.seasons && series.seasons.length > 0) {
      handleSeasonPlay(series.seasons[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, series, refreshing]);

  if (loading || refreshing) {
    return (
      <ProtectedRoute allowAnonymousWhenFree>
        <MainLayout>
          <div className="container-mobile flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="relative">
                <div className="absolute inset-0 water-ripple"></div>
                <Loading size="lg" text="Loading series..." variant="splash" />
              </div>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (error || !series) {
    return (
      <ProtectedRoute allowAnonymousWhenFree>
        <MainLayout>
          <div className="container-mobile text-center py-12">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tv size={24} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-dark-100 mb-2">
              {error || 'Series Not Found'}
            </h1>
            <p className="text-dark-400 mb-6">
              {error || 'The series you are looking for does not exist.'}
            </p>
            <Link href="/series" className="button-primary">
              <ArrowLeft size={20} className="mr-2" />
              Back to Series
            </Link>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowAnonymousWhenFree>
      <MainLayout>
        <div className="container-mobile space-y-8">
          {/* Back Button */}
          <div className="flex items-center space-x-4">
            <Link href="/series" className="text-dark-400 hover:text-dark-100 transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-responsive-xl font-bold text-dark-100">
              {series.title}
            </h1>
          </div>

          {/* Series Header */}
          <div className="glass-effect rounded-lg overflow-hidden">
            <div className="relative">
              {/* Series Thumbnail */}
              <div className="aspect-video relative">
                {series.thumbnailUrl ? (
                  <img
                    src={series.thumbnailUrl}
                    alt={series.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-dark-700 flex items-center justify-center">
                    <Tv size={64} className="text-dark-500" />
                  </div>
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                
                {/* Series Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between space-y-4 sm:space-y-0">
                    <div className="flex-1">
                      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                        {series.title}
                      </h1>
                      <FormattedText text={series.description} className="text-lg text-gray-200 mb-4 max-w-2xl" />
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
                        <div className="flex items-center space-x-1">
                          <Star size={16} className="text-yellow-400" />
                          <span>{series.rating || 0}/5</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Tv size={16} />
                          <span>{series.totalSeasons} season{series.totalSeasons > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users size={16} />
                          <span>{series.views.toLocaleString()} views</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock size={16} />
                          <span>{new Date(series.createdAt).getFullYear()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Play Button */}
                    <div className="flex space-x-3">
                      {series.seasons && series.seasons.length > 0 && (
                        <button
                          onClick={() => handleSeasonPlay(series.seasons[0])}
                          className="button-primary flex items-center space-x-2 px-6 py-3"
                        >
                          <Play size={20} />
                          <span>Play Season 1</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Series Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Seasons */}
              {series.seasons && series.seasons.length > 0 ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-dark-100 flex items-center">
                    <Tv size={24} className="mr-3 text-primary-400" />
                    Seasons ({series.seasons.length})
                  </h2>
                  
                  {series.seasons.map((season, seasonIndex) => {
                    const isExpanded = expandedSeasons.has(season.id);
                    const hasSeasonVideo = season.videoUrl || season.googleDriveUrl;
                    const hasEpisodes = season.episodes && season.episodes.length > 0;
                    
                    return (
                      <div key={season.id} className="glass-effect rounded-lg overflow-hidden">
                        {/* Season Header */}
                        <div className="p-4 border-b border-dark-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => toggleSeasonExpansion(season.id)}
                                className="text-dark-400 hover:text-dark-100 transition-colors"
                              >
                                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                              </button>
                              {season.thumbnailUrl && (
                                <div className="w-16 h-10 rounded overflow-hidden flex-shrink-0">
                                  <img
                                    src={season.thumbnailUrl}
                                    alt={season.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div>
                                <h3 className="font-semibold text-dark-100">
                                  Season {season.seasonNumber}: {season.title}
                                </h3>
                                <p className="text-sm text-dark-400">
                                  {hasEpisodes ? `${season.episodes.length} episodes` : 'No episodes yet'}
                                </p>
                              </div>
                            </div>
                            
                            {/* Season Play Button */}
                            {(hasSeasonVideo || hasEpisodes) && (
                              <button
                                onClick={() => handleSeasonPlay(season)}
                                className="button-primary flex items-center space-x-2 px-4 py-2"
                              >
                                <Play size={16} />
                                <span>Play</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Episodes List */}
                        <AnimatePresence>
                          {isExpanded && hasEpisodes && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 space-y-2">
                                {season.episodes.map((episode, episodeIndex) => (
                                  <div
                                    key={episode.id}
                                    className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg hover:bg-dark-700/50 transition-colors cursor-pointer"
                                    onClick={() => handleEpisodePlay(episode)}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 bg-primary-500 rounded flex items-center justify-center text-white text-sm font-bold">
                                        {episode.episodeNumber}
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-dark-100">
                                          {episode.title}
                                        </h4>
                                        <div className="flex items-center space-x-4 text-sm text-dark-400">
                                          <div className="flex items-center space-x-1">
                                            <Clock size={14} />
                                            <span>{formatDuration(episode.duration)}</span>
                                          </div>
                                          <div className="flex items-center space-x-1">
                                            <Users size={14} />
                                            <span>{episode.views}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <Play size={20} className="text-dark-400" />
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Tv size={48} className="mx-auto text-dark-600 mb-4" />
                  <h3 className="text-lg font-semibold text-dark-300 mb-2">
                    No Seasons Available
                  </h3>
                  <p className="text-dark-400">
                    This series doesn't have any seasons yet.
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Series Info */}
              <div className="glass-effect rounded-lg p-4">
                <h3 className="font-semibold text-dark-100 mb-3">Series Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-dark-400">Genre:</span>
                    <span className="text-dark-100">{(series.genre || []).join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Language:</span>
                    <span className="text-dark-100">{series.language.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Rating:</span>
                    <span className="text-dark-100">{series.rating || 0}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Views:</span>
                    <span className="text-dark-100">{series.views.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Cast */}
              {series.cast && series.cast.length > 0 && (
                <div className="glass-effect rounded-lg p-4">
                  <h3 className="font-semibold text-dark-100 mb-3">Cast</h3>
                  <div className="text-sm text-dark-300">
                    {(series.cast || []).join(', ')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Video Player Modal */}
        <AnimatePresence>
          {selectedEpisode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedEpisode(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-4xl bg-dark-900 rounded-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-dark-700 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-dark-100">
                    {selectedEpisode.title}
                  </h3>
                  <button
                    onClick={() => setSelectedEpisode(null)}
                    className="text-dark-400 hover:text-dark-100 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="aspect-video">
                  <UniversalVideoPlayer
                    isOpen={true}
                    onClose={() => {
                      setSelectedEpisode(null);
                      setIsSeasonVideo(false);
                    }}
                    movie={{
                      id: selectedEpisode.id,
                      title: selectedEpisode.title,
                      videoUrl: selectedEpisode.videoUrl,
                      downloadUrl: selectedEpisode.downloadUrl,
                      googleDriveUrl: selectedEpisode.googleDriveUrl,
                      thumbnailUrl: selectedEpisode.thumbnailUrl
                    }}
                    contentType={isSeasonVideo ? 'series' : 'episode'}
                    seriesId={series?.id}
                    episodeId={isSeasonVideo ? undefined : selectedEpisode.id}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </MainLayout>
    </ProtectedRoute>
  );
}
