'use client';

import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '@/components/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { searchContent } from '@/lib/content';
import { Movie, Series, Game } from '@/types';
import { Search, Film, Tv, Gamepad2, Clock, Star, Users, Calendar, Play, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SearchPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    movies: Movie[];
    series: Series[];
    stories: any[];
    games: Game[];
  }>({ movies: [], series: [], stories: [], games: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'movies' | 'series' | 'games'>('all');
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery.trim());
      } else {
        setSearchResults({ movies: [], series: [], stories: [], games: [] });
        setHasSearched(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const searchType = selectedCategory === 'games' ? 'all' : (selectedCategory === 'all' ? 'all' : selectedCategory as 'movies' | 'series' | 'stories');
      const results = await searchContent(
        query,
        searchType,
        user?.isAdult || false
      );
      setSearchResults({
        ...results,
        games: [], // Fallback since searchContent doesn't return games right now
      });
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ movies: [], series: [], stories: [], games: [] });
    } finally {
      setIsSearching(false);
    }
  };

  const totalResults = useMemo(() => {
    return searchResults.movies.length + searchResults.series.length + searchResults.games.length;
  }, [searchResults]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatReadTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
  };

  const getPlaceholderText = () => {
    return t('searchPlaceholder');
  };

  const getNoResultsText = () => {
    return `${t('noResultsFound')} "${searchQuery}"`;
  };

  const getTryDifferentText = () => {
    return t('tryDifferentSearch');
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="container-mobile space-y-8">
          {/* Header */}
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-primary-gradient rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-white" />
            </div>
            <h1 className="text-responsive-2xl font-bold text-gradient mb-2">
              {t('search')}
            </h1>
            <p className="text-responsive-base text-dark-300">
              {language === 'sw' 
                ? 'Tafuta filamu na mifululizo za hali ya juu' 
                : 'Search for high-quality movies and series'
              }
            </p>
          </div>

          {/* Search Input */}
          <div className="glass-effect rounded-lg p-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input pr-4"
                placeholder={getPlaceholderText()}
              />
              {isSearching && (
                <Loader2
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 animate-spin"
                />
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: t('all'), icon: Search },
              { key: 'movies', label: t('movies'), icon: Film },
              { key: 'series', label: t('series'), icon: Tv },
              { key: 'games', label: t('games'), icon: Gamepad2 },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  selectedCategory === key
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-800/50 text-dark-300 hover:bg-dark-700/50'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* Search Results */}
          {hasSearched && (
          <div className="space-y-6">
              {/* Results Summary */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-dark-100">
                  {isSearching ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={20} className="animate-spin" />
                      {t('searching')}
                    </span>
                  ) : (
                    `${totalResults} ${t('resultsFound')}`
                  )}
                </h2>
              </div>

              {/* No Results */}
              {!isSearching && totalResults === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-dark-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={32} className="text-dark-400" />
              </div>
              <h3 className="text-lg font-semibold text-dark-200 mb-2">
                    {getNoResultsText()}
              </h3>
              <p className="text-dark-400">
                    {getTryDifferentText()}
                  </p>
                </div>
              )}

              {/* Movies Results */}
              {!isSearching && searchResults.movies.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-dark-100 flex items-center gap-2">
                    <Film size={20} />
                    {t('movies')} ({searchResults.movies.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {searchResults.movies.map((movie) => (
                      <Link
                        key={movie.id}
                        href={`/movies/${movie.id}`}
                        className="glass-effect rounded-lg overflow-hidden hover:bg-dark-800/30 transition-colors duration-200"
                      >
                        <div className="aspect-[2/3] bg-dark-800 relative">
                          {movie.thumbnailUrl ? (
                            <img
                              src={movie.thumbnailUrl}
                              alt={movie.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film size={48} className="text-dark-400" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2">
                            <div className="flex items-center gap-2 text-white text-sm">
                              <Clock size={14} />
                              {formatDuration(movie.duration ?? 0)}
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold text-dark-100 mb-2 line-clamp-2">
                            {movie.title}
                          </h4>
                          <p className="text-sm text-dark-400 mb-3 line-clamp-2">
                            {movie.description}
                          </p>
                          <div className="flex items-center justify-between text-sm text-dark-300">
                            <div className="flex items-center gap-1">
                              <Star size={14} className="text-yellow-400 fill-current" />
                              {(movie.rating ?? 0).toFixed(1)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users size={14} />
                              {movie.views ?? 0}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Series Results */}
              {!isSearching && searchResults.series.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-dark-100 flex items-center gap-2">
                    <Tv size={20} />
                    {t('series')} ({searchResults.series.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {searchResults.series.map((series) => (
                      <Link
                        key={series.id}
                        href={`/series/${series.id}`}
                        className="glass-effect rounded-lg overflow-hidden hover:bg-dark-800/30 transition-colors duration-200"
                      >
                        <div className="aspect-[2/3] bg-dark-800 relative">
                          {series.thumbnailUrl ? (
                            <img
                              src={series.thumbnailUrl}
                              alt={series.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Tv size={48} className="text-dark-400" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2">
                            <div className="flex items-center gap-2 text-white text-sm">
                              <Calendar size={14} />
                              {series.totalSeasons} {t('seasons')}
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold text-dark-100 mb-2 line-clamp-2">
                            {series.title}
                          </h4>
                          <p className="text-sm text-dark-400 mb-3 line-clamp-2">
                            {series.description}
                          </p>
                          <div className="flex items-center justify-between text-sm text-dark-300">
                            <div className="flex items-center gap-1">
                              <Star size={14} className="text-yellow-400 fill-current" />
                              {(series.rating ?? 0).toFixed(1)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users size={14} />
                              {series.views ?? 0}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Games Results */}
              {!isSearching && searchResults.games.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-dark-100 flex items-center gap-2">
                    <Gamepad2 size={20} />
                    {t('games')} ({searchResults.games.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {searchResults.games.map((game) => (
                      <Link
                        key={game.id}
                        href={`/games/${game.id}`}
                        className="glass-effect rounded-lg overflow-hidden hover:bg-dark-800/30 transition-colors duration-200"
                      >
                        <div className="aspect-[2/3] bg-dark-800 relative">
                          {game.thumbnailUrl ? (
                            <img
                              src={game.thumbnailUrl}
                              alt={game.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Gamepad2 size={48} className="text-dark-400" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2">
                            <div className="flex items-center gap-2 text-white text-sm">
                              <span className="px-2 py-1 bg-primary-500/20 text-primary-300 rounded text-xs">
                                {game.category}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold text-dark-100 mb-2 line-clamp-2">
                            {game.title}
                          </h4>
                          <p className="text-sm text-dark-400 mb-3 line-clamp-2">
                            {game.description}
                          </p>
                          <div className="flex items-center justify-between text-sm text-dark-300">
                            <div className="flex items-center gap-1">
                              <span className="px-2 py-1 rounded text-xs bg-primary-500/20 text-primary-400">
                                {game.platform}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users size={14} />
                              {game.views ?? 0}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Quick Categories - Show when no search */}
          {!hasSearched && (
          <div className="space-y-6">
            <h2 className="text-responsive-xl font-bold text-dark-100">
                {t('browseByCategory')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  href="/movies"
                  className="glass-effect rounded-lg p-6 text-center hover:bg-dark-800/30 transition-colors duration-200"
                >
                <Film size={32} className="text-primary-400 mx-auto mb-3" />
                <h3 className="font-semibold text-dark-100 mb-2">{t('movies')}</h3>
                  <p className="text-sm text-dark-400">
                    {t('browseAllMovies')}
                  </p>
                </Link>
                <Link
                  href="/series"
                  className="glass-effect rounded-lg p-6 text-center hover:bg-dark-800/30 transition-colors duration-200"
                >
                <Tv size={32} className="text-primary-400 mx-auto mb-3" />
                <h3 className="font-semibold text-dark-100 mb-2">{t('series')}</h3>
                  <p className="text-sm text-dark-400">
                    {t('browseAllSeries')}
                  </p>
                </Link>
                <Link
                  href="/games"
                  className="glass-effect rounded-lg p-6 text-center hover:bg-dark-800/30 transition-colors duration-200"
                >
                <Gamepad2 size={32} className="text-primary-400 mx-auto mb-3" />
                <h3 className="font-semibold text-dark-100 mb-2">{t('games')}</h3>
                  <p className="text-sm text-dark-400">
                    {t('browseAllGames') || 'Browse all games'}
                  </p>
                </Link>
              </div>
            </div>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}