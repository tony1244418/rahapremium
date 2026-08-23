'use client';

import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '@/components/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { 
  Gamepad2, 
  Download, 
  Play, 
  ArrowLeft,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  getGameById, 
  incrementGameViews
} from '@/lib/games';
import { 
  hasAccessToContent,
  hasAccessToGame,
  getUserSubscriptionStatus,
  initiateGamePayment,
  checkPaymentStatus,
  completePayment,
  getPackagesConfig,
  PackagesConfigMap
} from '@/lib/subscriptions';
import { SUBSCRIPTION_PACKAGES } from '@/lib/subscriptions';
import { Game } from '@/types';
import { Loading } from '@/components/ui/Loading';
import Link from 'next/link';

// Game-specific vs normal/regular subscription packages.
const GAME_PACKAGES = ['KITONGA', 'ZEBRA', 'SIMBA', 'SWALA', 'NDOVU', 'FARU', 'TWIGA'];
const REGULAR_PACKAGES = ['FEDHA', 'CHUMA', 'DHAHABU', 'ALMASI', 'MALKIA'];

// Show the game price only when the game is unlocked exclusively by game
// packages. If the game also accepts a normal/regular package, the price is
// hidden (it's covered by a normal subscription).
const isGamePackageOnly = (requiredPackages?: string[]): boolean => {
  if (!requiredPackages || requiredPackages.length === 0) return false;
  const hasGamePkg = requiredPackages.some((p) => GAME_PACKAGES.includes(p));
  const hasNormalPkg = requiredPackages.some((p) => REGULAR_PACKAGES.includes(p));
  return hasGamePkg && !hasNormalPkg;
};

export default function GameDetailPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHowToSet, setShowHowToSet] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [hasGameAccess, setHasGameAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Hide bottom navigation when payment modal is open
  useEffect(() => {
    if (showPaymentModal) {
      document.body.classList.add('payment-modal-open');
    } else {
      document.body.classList.remove('payment-modal-open');
    }
    return () => {
      document.body.classList.remove('payment-modal-open');
    };
  }, [showPaymentModal]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed' | 'checking'>('pending');
  const [statusMessage, setStatusMessage] = useState('');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [packagesConfig, setPackagesConfig] = useState<PackagesConfigMap | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getPackagesConfig();
        setPackagesConfig(config);
      } catch (err) {
        console.error('Failed to load packages config', err);
        setPackagesConfig(SUBSCRIPTION_PACKAGES);
      }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    if (!gameId) return;

    // Load game and check access
    const loadGame = async () => {
      const result = await getGameById(gameId);
      if (result.success && result.data) {
        setGame(result.data);
        incrementGameViews(gameId);
        
        // Check game-specific access
        // If game is free, grant access automatically
        if (result.data.isFree) {
          setHasGameAccess(true);
          setCheckingAccess(false);
        } else if (user) {
          setCheckingAccess(true);
          const access = await hasAccessToGame(user, gameId, result.data.requiredPackages);
          setHasGameAccess(access);
          setCheckingAccess(false);
        } else {
          setCheckingAccess(false);
        }
      }
      setLoading(false);
    };

    loadGame();
  }, [gameId, user?.uid]);

  // Timeout for iframe loading
  useEffect(() => {
    if (showDownload && iframeLoading) {
      const timeout = setTimeout(() => {
        // If still loading after 5 seconds, assume it failed
        setIframeLoading(false);
        setIframeError(true);
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [showDownload, iframeLoading]);

  // Focus phone input when payment modal opens
  useEffect(() => {
    if (showPaymentModal && phoneInputRef.current && paymentStatus === 'pending' && !paymentRequest) {
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 100);
    }
  }, [showPaymentModal, paymentStatus, paymentRequest]);

  // Check subscription status (for display purposes)
  const subscriptionStatus = getUserSubscriptionStatus(user);
  
  const getGamePrice = (): number => {
    const pkgs = packagesConfig || SUBSCRIPTION_PACKAGES;
    // If game is free, return 0
    if (game?.isFree) {
      return 0;
    }

    // If per-content pricing is enabled and set
    if (game?.contentPrice !== undefined && game.contentPrice > 0) {
      return game.contentPrice;
    }
    
    if (!game || !game.requiredPackages || game.requiredPackages.length === 0) {
      return pkgs.FEDHA.price; // Default price
    }
    
    // Use the lowest price among required packages so any selected package can unlock the game
    const prices = game.requiredPackages
      .map(pkg => {
        const packageConfig = pkgs[pkg as keyof typeof SUBSCRIPTION_PACKAGES];
        return packageConfig ? packageConfig.price : Infinity;
      })
      .filter(price => price > 0 && price < Infinity);
    
    if (prices.length === 0) {
      return pkgs.FEDHA.price;
    }
    
    return Math.min(...prices);
  };

  const handleHowToSet = () => {
    if (!game) return;

    // Free games can view tutorial without subscription
    if (game.isFree) {
      setShowHowToSet(true);
      return;
    }

    // Require authentication
    if (!user) {
      router.push('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    // Require active game access/subscription before showing tutorial
    if (hasGameAccess) {
    setShowHowToSet(true);
    } else {
      // Prompt payment/subscription modal for access
      setShowPaymentModal(true);
    }
  };

  // Check if link is from a known download hosting site that blocks iframes
  const isDownloadHostingSite = (url: string): boolean => {
    const downloadHosts = [
      'mediafire.com',
      'dropbox.com',
      'mega.nz',
      'drive.google.com/file',
      'onedrive.live.com',
      'wetransfer.com',
      'zippyshare.com',
      'uploaded.net'
    ];
    return downloadHosts.some(host => url.toLowerCase().includes(host));
  };

  const handleDownload = async () => {
    if (!game) return;
    
    // If game is free, allow download without authentication or payment
    if (game.isFree) {
      // Always open download link in new tab, not in app
      if (game.downloadLink) {
        window.open(game.downloadLink, '_blank', 'noopener,noreferrer');
        return;
      }
      return;
    }
    
    // For paid games, require authentication
    if (!user) {
      router.push('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    // Re-check access before download
    const access = await hasAccessToGame(user, game.id, game.requiredPackages);
    setHasGameAccess(access);
    
    if (access) {
      // Always open download link in new tab, not in app
      if (game.downloadLink) {
        window.open(game.downloadLink, '_blank', 'noopener,noreferrer');
        return;
      }
    } else {
      // Show payment modal for per-game payment
      setShowPaymentModal(true);
    }
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If it starts with 255, remove it
    if (cleaned.startsWith('255')) {
      return cleaned.substring(3);
    }
    
    return cleaned;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const formatted = formatPhoneNumber(phone);
    return /^0[67][0-9]{8}$/.test(formatted);
  };

  const handleGamePayment = async () => {
    if (!user || !game) return;

    setPaymentLoading(true);

    try {
      // Ensure payment modal is open
      if (!showPaymentModal) {
        setShowPaymentModal(true);
      }

      const formattedPhone = formatPhoneNumber(phoneNumber);
      if (!validatePhoneNumber(formattedPhone)) {
        alert(t('validPhoneNumber'));
        // Focus on phone input field in the modal
        setTimeout(() => {
          phoneInputRef.current?.focus();
        }, 100);
        setPaymentLoading(false);
        return;
      }

      const gamePrice = getGamePrice();
      const payment = await initiateGamePayment(user, game.id, formattedPhone, gamePrice);
      setPaymentRequest(payment);
      setPaymentStatus('pending');
      setStatusMessage(t('paymentRequestSent'));
      
      // Start automatic polling for payment status
      startPaymentPolling(payment.orderId!);
    } catch (error) {
      console.error('Game payment initiation failed:', error);
      alert(t('paymentInitiationFailed'));
    } finally {
      setPaymentLoading(false);
    }
  };

  const startPaymentPolling = (orderId: string) => {
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    const poll = async () => {
      try {
        const result = await checkPaymentStatus(orderId);
        
        if (result.success && result.status === 'completed') {
          setPaymentStatus('completed');
          setStatusMessage(t('paymentCompletedSuccessfully'));
          
          // Complete the payment in the database
          if (paymentRequest && user) {
            await completePayment(paymentRequest.id, user, false, 'user-completion');
          }
          
          // Refresh game access
          if (user && game) {
            const access = await hasAccessToGame(user, game.id, game.requiredPackages);
            setHasGameAccess(access);
          }
          
          // Stop polling
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          
          // Close modal after 2 seconds
          setTimeout(() => {
            setShowPaymentModal(false);
            setPaymentRequest(null);
            setPaymentStatus('pending');
            setStatusMessage('');
          }, 2000);
        } else if (result.success && result.status === 'failed') {
          setPaymentStatus('failed');
          setStatusMessage(t('gamePaymentFailed'));
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
        }
      } catch (error) {
        console.error('Payment status check error:', error);
      }
    };

    // Poll every 3 seconds
    const interval = setInterval(poll, 3000);
    setPollingInterval(interval);
    
    // Initial check
    poll();
  };

  const closePaymentModal = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setShowPaymentModal(false);
    setPaymentRequest(null);
    setPaymentStatus('pending');
    setStatusMessage('');
    setPhoneNumber('');
  };

  const handleOpenExternal = () => {
    if (game?.downloadLink) {
      window.open(game.downloadLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleIframeLoad = () => {
    setIframeLoading(false);
    setIframeError(false);
  };

  const handleIframeError = () => {
    setIframeLoading(false);
    setIframeError(true);
  };

  const getVideoEmbedUrl = (url?: string) => {
    if (!url) return '';
    // Handle YouTube URLs
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    // Return original URL for direct video links
    return url;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="container-mobile flex items-center justify-center min-h-96">
            <Loading size="lg" text={t('loading')} variant="splash" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (!game) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="container-mobile text-center py-12">
            <Gamepad2 size={64} className="mx-auto text-dark-600 mb-4" />
            <h2 className="text-2xl font-bold text-dark-100 mb-2">{t('gameNotFound')}</h2>
            <p className="text-dark-400 mb-6">{t('gameNotFoundMessage')}</p>
            <Link href="/games" className="button-primary">
              {t('back')}
            </Link>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="container-mobile space-y-6 py-6">
          {/* Back Button */}
          <Link href="/games" className="inline-flex items-center space-x-2 text-primary-400 hover:text-primary-300">
            <ArrowLeft size={20} />
            <span>{t('back')}</span>
          </Link>

          {/* Game Header */}
          <div className="glass-effect rounded-lg overflow-hidden">
            <div className="relative aspect-video bg-dark-800">
              <img
                src={game.thumbnailUrl}
                alt={game.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-game.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            </div>
            <div className="p-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gradient mb-4">{game.title}</h1>
              <p className="text-dark-300 mb-6 text-sm sm:text-base">{game.description}</p>
              
              {/* Game Category and Platform */}
              <div className="flex flex-wrap gap-2 mb-6">
                {game.category && (
                  <span className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded-lg text-sm font-medium">
                    {game.category}
                  </span>
                )}
                {game.platform && (
                  <span className="px-3 py-1 rounded-lg text-sm font-medium bg-primary-500/20 text-primary-400">
                    {game.platform === 'PC' && 'PC'}
                    {game.platform === 'Mobile' && 'Mobile'}
                    {game.platform === 'Both' && 'Both'}
                  </span>
                )}
              </div>
              
              {/* Required Packages */}
              <div className="mb-6">
                <p className="text-sm text-dark-400 mb-2">{t('requiredSubscription')}</p>
                <div className="flex flex-wrap gap-2">
                  {game.requiredPackages?.map((pkg) => (
                    <span
                      key={pkg}
                      className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded-lg text-sm font-medium"
                    >
                      {pkg}
                    </span>
                  ))}
                </div>
              </div>

              {/* Access Status */}
              {game.isFree ? (
                <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <p className="text-green-400 font-semibold mb-2">{t('free')} {t('game')}</p>
                  <p className="text-sm text-dark-300">
                    {language === 'sw' ? 'Mchezo huu ni bure na unaweza kuupata bila malipo' : 'This game is free and you can download it without payment'}
                  </p>
                </div>
              ) : checkingAccess ? (
                <div className="mb-6 p-4 bg-dark-700 rounded-lg">
                  <p className="text-dark-300">{t('checkingAccess')}</p>
                </div>
              ) : hasGameAccess ? (
                <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <p className="text-green-400 font-semibold mb-2">{t('gameAccessActive')}</p>
                  <p className="text-sm text-dark-300">
                    {t('youHaveAccessToThisGame')}
                  </p>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 font-semibold mb-2">{t('paymentRequired')}</p>
                  <p className="text-sm text-dark-300 mb-3">
                    {t('gameRequiresOneTimePayment')}
                  </p>
                  <p className="text-xs text-dark-400 mb-3">
                    {t('requiredSubscriptionType')} {game.requiredPackages?.join(' or ')}
                  </p>
                  {/* Show price only for game-package-only games. If the game
                      also accepts a normal package, the price is hidden. */}
                  {isGamePackageOnly(game.requiredPackages) && (
                    <p className="text-lg font-bold text-yellow-400 mb-3">
                      TSH {getGamePrice().toLocaleString()}
                    </p>
                  )}
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {t('payForThisGame')}
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {(game?.howToSetVideoLink || game?.videoEmbedCode) && (
                  <button
                    onClick={handleHowToSet}
                    className="flex-1 button-secondary flex items-center justify-center space-x-2 py-3 sm:py-4"
                  >
                    <Play size={18} className="sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base">{t('watchTutorial')}</span>
                  </button>
                )}
                <button
                  onClick={handleDownload}
                  disabled={checkingAccess && !game?.isFree}
                  className="flex-1 button-primary flex items-center justify-center space-x-2 py-3 sm:py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={18} className="sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base">
                    {game?.isFree ? t('downloadNow') : hasGameAccess ? t('downloadNow') : t('payAndDownload')}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* How to Set Video Modal */}
          {showHowToSet && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-4xl glass-effect rounded-lg overflow-hidden"
              >
                <div className="p-4 border-b border-dark-700 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gradient">{t('howToSet')}</h2>
                  <button
                    onClick={() => setShowHowToSet(false)}
                    className="text-dark-400 hover:text-dark-100"
                  >
                    ×
                  </button>
                </div>
                <div className="aspect-video bg-dark-900">
                  {game.videoEmbedCode ? (
                    <div 
                      className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full"
                      dangerouslySetInnerHTML={{ __html: game.videoEmbedCode }} 
                    />
                  ) : (
                    <iframe
                      src={getVideoEmbedUrl(game.howToSetVideoLink)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {/* Payment Modal */}
          {showPaymentModal && game && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-md glass-effect rounded-lg overflow-hidden pb-16 sm:pb-10"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gradient">{t('payForGame')}</h2>
                    <button
                      onClick={closePaymentModal}
                      className="text-dark-400 hover:text-dark-100 text-2xl"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-dark-300 mb-2">
                      {t('gameLabel')} <span className="font-semibold text-white">{game.title}</span>
                    </p>
                    {/* Intentionally hide numeric amount from UI; amount is used internally only */}
                    <div className="p-3 bg-dark-800 rounded-lg mt-3">
                      <p className="text-sm text-dark-400 mb-1">
                        {language === 'sw' ? 'Jina lako:' : 'Your Name:'}
                      </p>
                      <p className="font-medium text-white">
                        {user?.displayName || user?.username || (language === 'sw' ? 'Mteja' : 'Customer')}
                      </p>
                    </div>
                  </div>

                  {paymentStatus === 'pending' && !paymentRequest && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                          {t('phoneNumber')}
                        </label>
                        <input
                          ref={phoneInputRef}
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="06XXXXXXXX or 07XXXXXXXX"
                          className="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
                        />
                      </div>
                      <button
                        onClick={handleGamePayment}
                        disabled={paymentLoading}
                        className="w-full button-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {paymentLoading ? t('processing') : t('payNow')}
                      </button>
                    </div>
                  )}

                  {paymentRequest && (
                    <div className="space-y-4">
                      <div className="p-4 bg-dark-800 rounded-lg">
                        <p className="text-sm text-dark-300 mb-2">{t('paymentStatusLabel')}</p>
                        <p className={`font-semibold ${
                          paymentStatus === 'completed' ? 'text-green-400' :
                          paymentStatus === 'failed' ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>
                          {statusMessage || t('waitingForPayment')}
                        </p>
                      </div>
                      
                      {paymentStatus === 'pending' && (
                        <button
                          onClick={() => {
                            if (paymentRequest.orderId) {
                              startPaymentPolling(paymentRequest.orderId);
                            }
                          }}
                          className="w-full button-secondary py-2"
                        >
                          {t('checkPaymentStatus')}
                        </button>
                      )}
                      
                      {paymentStatus === 'completed' && (
                        <button
                          onClick={closePaymentModal}
                          className="w-full button-primary py-2"
                        >
                          {t('close')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {/* Download Modal */}
          {showDownload && game && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-6xl h-[95vh] sm:h-[90vh] glass-effect rounded-lg overflow-hidden flex flex-col"
              >
                <div className="p-3 sm:p-4 border-b border-dark-700 flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold text-gradient flex items-center space-x-2">
                    <Download size={20} className="sm:w-6 sm:h-6" />
                    <span className="text-sm sm:text-base">{t('downloadGame')}</span>
                  </h2>
                  <button
                    onClick={() => {
                      setShowDownload(false);
                      setIframeError(false);
                      setIframeLoading(true);
                    }}
                    className="text-dark-400 hover:text-dark-100 text-2xl sm:text-3xl touch-button"
                  >
                    ×
                  </button>
                </div>
                
                {/* Iframe Error Fallback */}
                {iframeError ? (
                  <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
                    <div className="text-center max-w-md">
                      <AlertCircle size={64} className="mx-auto text-yellow-400 mb-4" />
                      <h3 className="text-xl font-bold text-dark-100 mb-2">
                        {t('unableToLoadDownloadPage')}
                      </h3>
                      <p className="text-dark-400 mb-6 text-sm sm:text-base">
                        {t('downloadLinkCannotBeDisplayed')}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                          onClick={handleOpenExternal}
                          className="button-primary flex items-center justify-center space-x-2 py-3 sm:py-4"
                        >
                          <ExternalLink size={20} />
                          <span>{t('openDownloadLink')}</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowDownload(false);
                            setIframeError(false);
                            setIframeLoading(true);
                          }}
                          className="button-secondary py-3 sm:py-4"
                        >
                          {t('close')}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-hidden relative">
                    {iframeLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-dark-900 backdrop-blur-sm">
                        <Loading size="md" text={t('loadingDownloadPage')} variant="classic" />
                      </div>
                    )}
                    <iframe
                      src={game.downloadLink}
                      className="w-full h-full border-0"
                      title={game.title}
                      allow="fullscreen"
                      onLoad={handleIframeLoad}
                      onError={handleIframeError}
                      style={{ display: iframeLoading ? 'none' : 'block' }}
                    />
                  </div>
                )}
                
                {/* External Link Button (always visible as backup) */}
                <div className="p-3 sm:p-4 border-t border-dark-700">
                  <button
                    onClick={handleOpenExternal}
                    className="w-full button-secondary flex items-center justify-center space-x-2 py-3 sm:py-4"
                  >
                    <ExternalLink size={18} className="sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base">{t('openInNewTab')}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

