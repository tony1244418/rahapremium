'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMovies } from '@/lib/content';
import { Play, Star, Clock, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Movie {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoLink: string;
  duration: number;
  releaseYear: string;
  rating: number;
  genre: string[];
  language: string;
  quality: string;
  views: number;
  isAdult: boolean;
}

export default function AdultMoviesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [ageVerified, setAgeVerified] = useState(false);

  useEffect(() => {
    loadAdultMovies();
  }, []);

  const loadAdultMovies = async () => {
    try {
      setLoading(true);
      const result = await getMovies(true, true); // activeOnly=true, includeAdult=true
      
      if (result.success && result.data) {
        // Filter only adult movies
        const adultMovies = result.data.filter((movie: Movie) => movie.isAdult);
        setMovies(adultMovies);
      }
    } catch (error) {
      console.error('Error loading adult movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMovieClick = (movieId: string) => {
    router.push(`/movies/${movieId}`);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Age verification modal
  if (!ageVerified) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔞</div>
          <h1 className="text-3xl font-bold text-white mb-4">Adult Content</h1>
          <p className="text-gray-300 mb-6">
            This section contains adult content. You must be 18 years or older to continue.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setAgeVerified(true)}
              className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              I am 18+ years old
            </button>
            <button
              onClick={() => router.push('/movies')}
              className="w-full bg-gray-700 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-600 transition"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-red-900/50 to-black pt-24 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">🔞</span>
            <h1 className="text-4xl md:text-5xl font-bold">Adult Movies</h1>
          </div>
          <p className="text-gray-300 text-lg">
            Premium adult content - {movies.length} movies available
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-800 rounded-lg aspect-[2/3] mb-2"></div>
                <div className="bg-gray-800 h-4 rounded mb-2"></div>
                <div className="bg-gray-800 h-3 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-2xl font-bold mb-2">No Adult Movies Available</h2>
            <p className="text-gray-400">Check back later for new content</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {movies.map((movie) => (
              <div
                key={movie.id}
                onClick={() => handleMovieClick(movie.id)}
                className="group cursor-pointer transition-transform hover:scale-105"
              >
                {/* Movie Poster */}
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 mb-2">
                  {movie.thumbnailUrl ? (
                    <Image
                      src={movie.thumbnailUrl}
                      alt={movie.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      🎬
                    </div>
                  )}

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                    <Play className="w-12 h-12 text-red-500" />
                    <p className="text-xs text-center line-clamp-3">{movie.description}</p>
                  </div>

                  {/* Quality Badge */}
                  <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
                    {movie.quality}
                  </div>

                  {/* Adult Badge */}
                  <div className="absolute top-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                    18+
                  </div>

                  {/* Rating */}
                  {movie.rating > 0 && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/80 px-2 py-1 rounded">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs">{movie.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {/* Movie Info */}
                <div>
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-red-500 transition">
                    {movie.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {movie.releaseYear && <span>{movie.releaseYear}</span>}
                    {movie.duration > 0 && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDuration(movie.duration)}</span>
                        </div>
                      </>
                    )}
                  </div>
                  {movie.genre && movie.genre.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                      {movie.genre.slice(0, 2).join(', ')}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {movie.views.toLocaleString()} views
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Warning */}
      <div className="bg-red-900/20 border-t border-red-900/50 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">
            ⚠️ This content is intended for mature audiences only (18+)
          </p>
        </div>
      </div>
    </div>
  );
}
