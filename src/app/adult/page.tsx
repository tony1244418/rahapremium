'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Film, Lock, ArrowLeft } from 'lucide-react';
import { getAllMovies, type Movie } from '@/lib/content';

export default function AdultContentPage() {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const [adultMovies, setAdultMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has verified age in this session
    const verified = sessionStorage.getItem('adult_verified');
    if (verified === 'true') {
      setIsVerified(true);
      loadAdultContent();
    } else {
      setLoading(false);
    }
  }, []);

  const loadAdultContent = async () => {
    try {
      setLoading(true);
      const movies = await getAllMovies(true); // includeAdult = true
      const adultOnly = movies.filter(m => m.isAdult);
      console.log('Adult movies loaded:', adultOnly.length);
      setAdultMovies(adultOnly);
    } catch (error) {
      console.error('Error loading adult content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAge = () => {
    sessionStorage.setItem('adult_verified', 'true');
    setIsVerified(true);
    loadAdultContent();
  };

  const handleDecline = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="bg-red-500/10 p-4 rounded-full">
              <Lock className="w-12 h-12 text-red-500" />
            </div>
          </div>
          
          <div className="text-center mb-6">
            <div className="inline-block bg-red-500/20 text-red-400 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              +18 Wakubwa
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Adult Content Warning</h1>
            <p className="text-gray-400">Adults only — 18 years and above</p>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
            <p className="text-yellow-400 text-sm text-center">
              This section contains adult content. By proceeding, you confirm that you are 18 years or older.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleVerifyAge}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg"
            >
              I am 18+ years old
            </button>
            <button
              onClick={handleDecline}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-all duration-200"
            >
              Take me back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black pb-20">
      {/* Header with back button */}
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">Adult Content</h1>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-block bg-red-500/20 text-red-400 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            +18 Wakubwa
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Adult Content
          </h1>
          <p className="text-gray-400">
            Adults only — 18 years and above
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold">
            <Film className="w-5 h-5" />
            Movies
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {adultMovies.length}
            </span>
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-lg font-semibold transition-colors">
            Video Clips
            <span className="bg-gray-700 px-2 py-0.5 rounded-full text-xs">0</span>
          </button>
        </div>

        {/* Movies Grid */}
        {adultMovies.length === 0 ? (
          <div className="text-center py-20">
            <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No adult movies available</p>
            <p className="text-gray-500 text-sm mt-2">Check back later for updates</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {adultMovies.map((movie) => (
              <div
                key={movie.id}
                onClick={() => router.push(`/movie/${movie.id}`)}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800">
                  {/* 18+ Badge */}
                  <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                    18+
                  </div>

                  {/* Thumbnail */}
                  {movie.thumbnailUrl ? (
                    <img
                      src={movie.thumbnailUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                      <Film className="w-12 h-12 text-gray-600" />
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-xs font-semibold line-clamp-2">
                        {movie.title}
                      </p>
                      {movie.releaseYear && (
                        <p className="text-gray-300 text-xs mt-1">
                          {movie.releaseYear}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Title (visible on mobile) */}
                <h3 className="text-white text-sm mt-2 line-clamp-2 md:hidden">
                  {movie.title}
                </h3>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
