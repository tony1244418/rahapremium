import React from 'react';
import MainLayout from '@/components/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { MovieDetailPage } from '@/components/MovieDetailPage';

interface MovieDetailPageWrapperProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MovieDetailPageWrapper({ params }: MovieDetailPageWrapperProps) {
  try {
    const resolvedParams = await params;
    const movieId = resolvedParams?.id;

    if (!movieId) {
      return (
        <ProtectedRoute>
          <MainLayout>
            <div className="container-mobile flex items-center justify-center min-h-96">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-dark-200 mb-2">
                  Movie not found
                </h3>
                <p className="text-dark-400">
                  The movie you are looking for does not exist.
                </p>
              </div>
            </div>
          </MainLayout>
        </ProtectedRoute>
      );
    }

    return (
      <ProtectedRoute>
        <MainLayout>
          <MovieDetailPage movieId={movieId} />
        </MainLayout>
      </ProtectedRoute>
    );
  } catch (error) {
    console.error('Error in MovieDetailPageWrapper:', error);
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="container-mobile flex items-center justify-center min-h-96">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-dark-200 mb-2">
                Error loading movie
              </h3>
              <p className="text-dark-400">
                There was an error loading the movie. Please try again.
              </p>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }
}
