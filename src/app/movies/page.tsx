'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Film, Play, Star, Clock, Users, Search, Filter, Grid, List } from 'lucide-react';
import { motion } from 'framer-motion';
import { subscribeToMovies, formatDuration, getContentTypeColor } from '@/lib/content-management';
import { Movie } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loading } from '@/components/ui/Loading';
import { VideoThumbnail } from '@/components/VideoThumbnail';

export default function MoviesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load movies from database
  useEffect(() => {
    const unsubscribe = subscribeToMovies((data) => {
      // Filter only active movies and exclude adult content (adult content should only appear on /adult page)
      const activeMovies = data.filter(movie => movie.isActive && !movie.isAdult);
      setMovies(activeMovies);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter movies based on search and genre
  useEffect(() => {
    let filtered = [...movies];

    // Search filter
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase();
      filtered = filtered.filter(movie =>
        movie.title.toLowerCase().includes(searchTerm) ||
        movie.description.toLowerCase().includes(searchTerm) ||
        movie.genre.some(g => g.toLowerCase().includes(searchTerm))
      );
    }

    // Genre filter
    if (genreFilter !== 'all') {
      filtered = filtered.filter(movie =>
        movie.genre.some(g => g.toLowerCase() === genreFilter.toLowerCase())
      );
    }

    setFilteredMovies(filtered);
  }, [movies, searchQuery, genreFilter]);

  // Get unique genres for filter
  const genres = Array.from(new Set(movies.flatMap(movie => movie.genre)));

  // Handle movie click
  const handleMovieClick = (movieId: string) => {
    router.push(`/movies/${movieId}`);
  };

  if (loading) {
    return (
      <ProtectedRoute allowAnonymousWhenFree>
        <MainLayout>
          <div className="container-mobile flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="relative">
                <div className="absolute inset-0 water-ripple"></div>
                <Loading size="lg" text="Loading movies..." variant="splash" />
              </div>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowAnonymousWhenFree>
      <MainLayout>
        <div className="container-mobile space-y-8">
          {/* Header */}
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-primary-gradient rounded-full flex items-center justify-center mx-auto mb-4">
              <Film size={32} className="text-white" />
            </div>
            <h1 className="text-responsive-2xl font-bold text-gradient mb-2">
              {t('movies')}
            </h1>
            <p className="text-responsive-base text-dark-300">
              Discover amazing movies from East Africa
            </p>
          </div>

          {/* Search and Filters */}
          {movies.length > 0 && (
            <div className="glass-effect rounded-lg p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" size={20} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus-ring"
                    placeholder="Search movies..."
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={genreFilter}
                    onChange={(e) => setGenreFilter(e.target.value)}
                    className="bg-dark-800 border border-dark-600 rounded-lg px-4 py-3 text-dark-100"
                  >
                    <option value="all">All Genres</option>
                    {genres.map(genre => (
                      <option key={genre} value={genre}>{genre}</option>
                    ))}
                  </select>
                  <div className="flex bg-dark-800 border border-dark-600 rounded-lg">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-3 ${viewMode === 'grid' ? 'bg-primary-500 text-white' : 'text-dark-400 hover:text-dark-100'}`}
                    >
                      <Grid size={20} />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-3 ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-dark-400 hover:text-dark-100'}`}
                    >
                      <List size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Movies Grid */}
          {filteredMovies.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                <Film size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-dark-200 mb-2">
                {movies.length === 0 ? 'No Movies Available' : 'No Movies Found'}
              </h3>
              <p className="text-dark-400 mb-4">
                {movies.length === 0 
                  ? 'Check back later for new movies' 
                  : 'Try adjusting your search criteria'
                }
              </p>
              {user && (
                <Link href="/admin" className="button-primary">
                  Admin Panel
                </Link>
              )}
            </div>
          ) : (
            <div className="relative">
              {/* Blurred Background Watermark - Uses first movie thumbnail */}
              {filteredMovies[0]?.thumbnailUrl && (
                <div 
                  className="absolute inset-0 -z-10 opacity-[0.04] pointer-events-none rounded-2xl overflow-hidden"
                  style={{
                    backgroundImage: `url(${filteredMovies[0].thumbnailUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    filter: 'blur(60px) brightness(0.3) saturate(1.5)',
                    transform: 'scale(1.3)',
                  }}
                />
              )}
              
              {/* Additional gradient overlay for depth */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-dark-900/40 via-transparent to-dark-900/40 pointer-events-none rounded-2xl" />
              
              <div className={`relative z-0 ${viewMode === 'grid' 
                ? 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'
                : 'space-y-4'
              }`}>
              {filteredMovies.map((movie, index) => (
                <motion.div
                  key={movie.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`glass-effect rounded-lg overflow-hidden hover:bg-dark-800/30 transition-all duration-200 group cursor-pointer ${
                    viewMode === 'list' ? 'flex' : ''
                  }`}
                  onClick={() => handleMovieClick(movie.id)}
                >
                  {/* Movie Thumbnail - Auto-playing Video Preview */}
                  <div className={`relative ${viewMode === 'list' ? 'w-32 h-20 flex-shrink-0' : 'aspect-[2/3]'}`}>
                    <VideoThumbnail
                      videoUrl={movie.videoUrl || movie.googleDriveUrl || ''}
                      thumbnailUrl={movie.thumbnailUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                      fallbackIcon={<Play size={32} className="text-dark-500" />}
                    />
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <Play size={24} className="text-white" />
                      </div>
                    </div>

                    {/* Movie Info Overlay */}
                    <div className="absolute top-2 left-2">
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                        MOVIE
                      </span>
                    </div>
                    <div className="absolute top-2 right-2">
                      <div className="flex items-center space-x-1 bg-black/50 rounded px-2 py-1">
                        <Star size={12} className="text-yellow-400" />
                        <span className="text-xs text-white">{movie.rating || 0}</span>
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <div className="flex items-center space-x-1 bg-black/50 rounded px-2 py-1">
                        <Clock size={12} className="text-white" />
                        <span className="text-xs text-white">{formatDuration(movie.duration)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Movie Info */}
                  <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                    <h3 className="font-semibold text-dark-100 mb-2 group-hover:text-primary-400 transition-colors duration-200 line-clamp-2">
                      {movie.title}
                    </h3>
                    
                    <p className="text-sm text-dark-400 mb-3 line-clamp-2">
                      {movie.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {movie.genre.slice(0, 3).map((g, idx) => (
                        <span key={idx} className="text-xs bg-dark-700 text-dark-300 px-2 py-1 rounded">
                          {g}
                        </span>
                      ))}
                      {movie.genre.length > 3 && (
                        <span className="text-xs bg-dark-700 text-dark-300 px-2 py-1 rounded">
                          +{movie.genre.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm text-dark-400 mb-3">
                      <div className="flex items-center space-x-1">
                        <Users size={14} />
                        <span>{movie.views.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock size={14} />
                        <span>{formatDuration(movie.duration)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-dark-500">
                      <span>{movie.director}</span>
                      <span>{movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : ''}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
              </div>
            </div>
          )}

          {/* Stats */}
          {movies.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-effect rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary-400 mb-1">
                  {movies.length}
                </div>
                <div className="text-sm text-dark-400">Total Movies</div>
              </div>
              <div className="glass-effect rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary-400 mb-1">
                  {genres.length}
                </div>
                <div className="text-sm text-dark-400">Genres</div>
              </div>
              <div className="glass-effect rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary-400 mb-1">
                  {movies.reduce((sum, movie) => sum + movie.views, 0).toLocaleString()}
                </div>
                <div className="text-sm text-dark-400">Total Views</div>
              </div>
            </div>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}