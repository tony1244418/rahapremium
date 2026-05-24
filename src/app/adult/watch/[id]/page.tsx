import React from 'react';
import MainLayout from '@/components/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AdultVideoDetailPage } from '@/components/AdultVideoDetailPage';
import { AlertTriangle } from 'lucide-react';

interface AdultWatchPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function AdultWatchPage({ params }: AdultWatchPageProps) {
    try {
        const resolvedParams = await params;
        const videoId = resolvedParams?.id;

        if (!videoId) {
            return (
                <ProtectedRoute>
                    <MainLayout>
                        <div className="container-mobile flex items-center justify-center min-h-96">
                            <div className="text-center">
                                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-dark-200 mb-2">
                                    Video not found
                                </h3>
                                <p className="text-dark-400">
                                    The video you are looking for does not exist.
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
                    <AdultVideoDetailPage videoId={videoId} />
                </MainLayout>
            </ProtectedRoute>
        );
    } catch (error) {
        console.error('Error in AdultWatchPage:', error);
        return (
            <ProtectedRoute>
                <MainLayout>
                    <div className="container-mobile flex items-center justify-center min-h-96">
                        <div className="text-center">
                            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-dark-200 mb-2">
                                Error loading video
                            </h3>
                            <p className="text-dark-400">
                                There was an error loading the video. Please try again.
                            </p>
                        </div>
                    </div>
                </MainLayout>
            </ProtectedRoute>
        );
    }
}
