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
    Lock,
    AlertTriangle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUserSubscriptionStatus, hasAccessToContent, hasPurchasedContent, isContentFree } from '@/lib/subscriptions';
import { getMovieById } from '@/lib/content';
import { Movie, SubscriptionPackage } from '@/types';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { GoogleDriveEmbedPlayer } from './GoogleDriveEmbedPlayer';
import { useRouter } from 'next/navigation';
import { VideoThumbnail } from './VideoThumbnail';
import { downloadVideoFromUrl, isDownloadableUrl, getBestDownloadUrl } from '@/lib/videoDownloadUtils';
import { FormattedText } from '@/components/ui/FormattedText';

interface AdultVideoDetailPageProps {
    videoId: string;
}

export const AdultVideoDetailPage: React.FC<AdultVideoDetailPageProps> = ({ videoId }) => {
    const { t } = useLanguage();
    const { user, refreshUserData } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const fromPayment = searchParams.get('paid') === 'true';
    const [video, setVideo] = useState<Movie | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showVideoPlayer, setShowVideoPlayer] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [freshContentAccesses, setFreshContentAccesses] = useState<string[]>(user?.contentAccesses || []);
    const [refreshing, setRefreshing] = useState(true); // wait for fresh DB check before showing access UI
    // If arriving from payment, skip refreshing gate and auto-play
    const [autoPlay] = useState(fromPayment);

    const subscriptionStatus = getUserSubscriptionStatus(user);
    const free = video ? isContentFree(video) : false;
    // If coming from payment page, treat as purchased regardless of stale user context
    const hasPurchased = autoPlay || (video ? (freshContentAccesses.includes(video.id) || (user?.contentAccesses || []).includes(video.id)) : false);
    const isPerContentPurchase = !!(video?.contentPurchaseEnabled) && !free && !hasPurchased;
    const hasAccess = autoPlay || free || hasPurchased || hasAccessToContent(user, video?.requiredPackages || []);

    useEffect(() => {
        const fetchVideo = async () => {
            try {
                setLoading(true);
                setError(null);

                if (!videoId) {
                    setError('No video ID provided');
                    return;
                }

                console.log('Fetching adult video with ID:', videoId);
                // We reuse getMovieById as adult videos are stored in movies collection
                const videoData = await getMovieById(videoId);

                if (videoData) {
                    // Verify it is actually adult content
                    if (!videoData.isAdult) {
                        console.warn('Content is not marked as adult:', videoId);
                        // Optionally redirect or show error? For now, we load it but log warning.
                        // In strict mode we might want to return null/error.
                    }
                    console.log('Video loaded successfully:', videoData.title);
                    setVideo(videoData);
                } else {
                    console.log('Video not found for ID:', videoId);
                    setError('Video not found');
                }
            } catch (err) {
                console.error('Error fetching video:', err);
                setError('Failed to load video');
            } finally {
                setLoading(false);
            }
        };

        if (videoId) {
            fetchVideo();
        }
    }, [videoId]);

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
                    if (data?.content_accesses) {
                        setFreshContentAccesses(data.content_accesses);
                    }
                }
            } finally {
                setRefreshing(false);
            }
        };
        refreshAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-open player when arriving from payment and video is ready
    useEffect(() => {
        if (autoPlay && video && !refreshing) {
            setShowVideoPlayer(true);
        }
    }, [autoPlay, video, refreshing]);

    const handlePlay = () => {
        if (isPerContentPurchase) {
            // Don't redirect to subscriptions — show buy prompt below
            return;
        }
        if (hasAccess) {
            setShowVideoPlayer(true);
        } else {
            router.push(`/subscriptions?redirect=${encodeURIComponent(`/adult/watch/${video?.id}`)}`);
        }
    };

    const handleDownload = async () => {
        if (!video || !hasAccess) {
            setError('You need to subscribe to download this video');
            return;
        }

        // If downloadUrl is provided (Bunny CDN direct link), open it in a new tab
        if (video.downloadUrl) {
            window.open(video.downloadUrl, '_blank');
            return;
        }

        // Fallback to videoUrl for other download methods
        const downloadUrl = video.videoUrl || video.googleDriveUrl || '';
        if (!downloadUrl) {
            setError('No video URL available for download');
            return;
        }

        if (!isDownloadableUrl(downloadUrl)) {
            setError('This video cannot be downloaded directly. Please use the video player to watch it.');
            return;
        }

        setIsDownloading(true);
        setError(null);

        try {
            const finalDownloadUrl = getBestDownloadUrl(downloadUrl) || downloadUrl;
            const filename = `${video.title.replace(/[^a-z0-9]/gi, '_')}.mp4`;

            await downloadVideoFromUrl(finalDownloadUrl, filename, true);

            setIsDownloading(false);
        } catch (error: any) {
            console.error('[DOWNLOAD] Download failed:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            setError(`Download failed: ${errorMessage}`);
            setIsDownloading(false);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: video?.title,
                    text: video?.description,
                    url: window.location.href,
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
        }
    };

    if (loading || refreshing) {
        return (
            <div className="container-mobile flex items-center justify-center min-h-96">
                <div className="relative">
                    <div className="absolute inset-0 water-ripple"></div>
                    <Loading size="lg" text="Loading content..." variant="splash" />
                </div>
            </div>
        );
    }

    if (error || !video) {
        return (
            <div className="container-mobile flex items-center justify-center min-h-96">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-dark-200 mb-2">
                        {error || 'Video not found'}
                    </h3>
                    <p className="text-dark-400 mb-4">
                        {error || 'The video you are looking for does not exist.'}
                    </p>
                    <Button
                        onClick={() => router.push('/adult')}
                        variant="outline"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Adult Section
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container-mobile space-y-6">
            {/* Back Button - Custom for Adult Section */}
            <button
                onClick={() => router.push('/adult')}
                className="flex items-center text-dark-300 hover:text-white transition-colors mb-4"
            >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span>Back to Adult Section</span>
            </button>

            {/* Adult Warning */}
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 flex items-center gap-3 mb-4">
                <AlertTriangle className="text-red-500 w-5 h-5 flex-shrink-0" />
                <p className="text-red-200 text-sm">
                    This content is rated 18+. Viewer discretion is advised.
                </p>
            </div>

            {/* Video Header */}
            <div className="relative">
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-dark-800">
                    <VideoThumbnail
                        videoUrl={video.videoUrl || video.googleDriveUrl || ''}
                        thumbnailUrl={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        fallbackIcon={<Play size={48} className="text-dark-500" />}
                    />

                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handlePlay}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${hasAccess
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-gray-500/80 hover:bg-gray-500 text-gray-200 backdrop-blur-sm'
                                }`}
                        >
                            <Play size={32} className={!hasAccess ? "ml-1" : ""} />
                        </motion.button>
                    </div>

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

            {/* Info */}
            <div className="space-y-4">
                <div>
                    <h1 className="text-2xl font-bold text-dark-100 mb-2">{video.title}</h1>
                    <FormattedText text={video.description} className="text-dark-300 leading-relaxed" />
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-4 text-sm text-dark-400">
                    {video.duration && video.duration > 0 && (
                    <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{Math.floor(video.duration / 60)}h {video.duration % 60}m</span>
                    </div>
                    )}
                    {video.releaseDate && (
                    <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(video.releaseDate).getFullYear()}</span>
                    </div>
                    )}
                    <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{video.views.toLocaleString()} views</span>
                    </div>
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-2">
                    {(video.genre || []).map((g, idx) => (
                        <span key={idx} className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm">
                            {g}
                        </span>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                        onClick={isPerContentPurchase ? undefined : (hasAccess ? handlePlay : () => router.push('/subscriptions'))}
                        className={`flex-1 ${isPerContentPurchase ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
                    >
                        <Play className="w-4 h-4 mr-2" />
                        {isPerContentPurchase
                          ? `Buy to Watch — TZS ${(video.contentPrice || 0).toLocaleString()}`
                          : hasAccess ? 'Watch Now' : 'Subscribe to Watch'
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
                bg-gradient-to-r from-red-500 via-red-600 to-red-700
                border-red-500/50
                text-white
                shadow-lg shadow-red-500/50
                hover:shadow-xl hover:shadow-red-500/70
                hover:from-red-400 hover:via-red-500 hover:to-red-600
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
                                    TZS {(video.contentPrice || 0).toLocaleString()}
                                    <span className="text-sm font-normal ml-2 text-amber-300">/ {video.contentPriceDays || 30} days</span>
                                </p>
                                <Button
                                    onClick={() => router.push(`/pay?contentId=${video.id}&type=adult`)}
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
                                    You need a {(video.requiredPackages || []).join(' or ')} subscription to watch this video.
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
            {showVideoPlayer && video && (
                <GoogleDriveEmbedPlayer
                    isOpen={showVideoPlayer}
                    onClose={() => setShowVideoPlayer(false)}
                    movie={{
                        id: video.id,
                        title: video.title,
                        videoUrl: video.videoUrl,
                        downloadUrl: video.downloadUrl,
                        googleDriveUrl: video.googleDriveUrl,
                        thumbnailUrl: video.thumbnailUrl
                    }}
                    contentType="movie"
                />
            )}
        </div>
    );
};
