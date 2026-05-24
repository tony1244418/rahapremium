'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import MainLayout from '@/components/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Crown, 
  Calendar, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock,
  Download,
  Smartphone,
  User
} from 'lucide-react';
import { 
  SUBSCRIPTION_PACKAGES, 
  getPackagesConfig,
  PackagesConfigMap,
  getUserSubscriptionStatus, 
  initiatePayment,
  checkPaymentStatus,
  completePayment
} from '@/lib/subscriptions';
import { SubscriptionPackage, PaymentRequest } from '@/types';
import { motion } from 'framer-motion';
import LiveTimer from '@/components/ui/LiveTimer';

export default function SubscriptionsPage() {
  const router = useRouter();
  const { user, refreshUserData, signInWithPhone } = useAuth();
  const { t } = useLanguage();
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'completed' | 'failed'>('pending');
  const [statusMessage, setStatusMessage] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showTestUserModal, setShowTestUserModal] = useState(false);
  const [packagesConfig, setPackagesConfig] = useState<PackagesConfigMap | null>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const modalPhoneInputRef = useRef<HTMLInputElement>(null);

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

  const subscriptionStatus = getUserSubscriptionStatus(user);

  // Pre-fill phone number only once on mount — never overwrite user edits
  useEffect(() => {
    setPhoneNumber(prev => {
      // If the user has already typed something, keep it
      if (prev !== '') return prev;
      if (!user) return '';
      if (user.phoneNumber) return user.phoneNumber.replace(/^\+255/, '0');
      return '';
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createTestUser = async () => {
    try {
      await signInWithPhone('+255788672140', 'testuser', 'Test User');
      setShowTestUserModal(false);
      alert(t('testUserCreated'));
    } catch (error) {
      console.error('Error creating test user:', error);
      alert(t('errorCreatingTestUser'));
    }
  };

  const packageOrder: SubscriptionPackage[] = ['FEDHA', 'CHUMA', 'DHAHABU', 'ALMASI', 'MALKIA'];

  const packageColors: Record<string, string> = {
    FEDHA:   'from-yellow-500 to-yellow-600',
    CHUMA:   'from-gray-400 to-gray-600',
    DHAHABU: 'from-yellow-400 to-yellow-600',
    ALMASI:  'from-blue-400 to-blue-600',
    MALKIA:  'from-purple-500 to-purple-700',
  };

  // Phone number validation function
  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^0[67][0-9]{8}$/;
    return phoneRegex.test(phone);
  };

  // Format phone number to ensure correct format
  const formatPhoneNumber = (phone: string): string => {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If it starts with 255, replace with 0
    if (cleaned.startsWith('255')) {
      cleaned = '0' + cleaned.substring(3);
    }
    
    // If it doesn't start with 0, add it
    if (!cleaned.startsWith('0')) {
      cleaned = '0' + cleaned;
    }
    
    return cleaned;
  };

  const handleSubscribe = async (packageType: SubscriptionPackage) => {
    // Check if user has active subscription and show warning
    if (user && user.subscription && user.subscription.isActive) {
      const remainingDays = Math.ceil((user.subscription.endDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000));
      const packageConfig = (packagesConfig || SUBSCRIPTION_PACKAGES)[packageType];
      
      let warningMessage = '';
      if (user.subscription.packageType === packageType) {
        warningMessage = `You have ${remainingDays} days left on your current ${packageType} subscription. Renewing will double your duration to ${packageConfig.days * 2} days. Continue?`;
      } else {
        warningMessage = `You have ${remainingDays} days left on your current ${user.subscription.packageType} subscription. This will be added to your new ${packageType} subscription (${packageConfig.days} days). Total: ${remainingDays + packageConfig.days} days. Continue?`;
      }
      
      if (!confirm(warningMessage)) {
        return;
      }
    }

    // Check if user is authenticated
    if (!user) {
      alert(t('pleaseLogInFirst'));
      window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    // Open payment modal first (don't initiate payment yet)
    setSelectedPackage(packageType);
    setShowPaymentModal(true);
    setPaymentRequest(null);
    setPaymentStatus('pending');
    setStatusMessage('');
    setPaymentError(null);
    
    // Focus on modal phone input
    setTimeout(() => {
      modalPhoneInputRef.current?.focus();
    }, 100);
  };

  const handleConfirmPayment = async () => {
    if (!user || !selectedPackage) return;

    setLoading(true);

    try {
      // Use phone number from modal input or fallback to main input
      const phoneToUse = phoneNumber || (user.phoneNumber || '');
      const formattedPhone = formatPhoneNumber(phoneToUse);
      
      if (!validatePhoneNumber(formattedPhone)) {
        alert(t('validPhoneNumber'));
        setTimeout(() => {
          modalPhoneInputRef.current?.focus();
        }, 100);
        setLoading(false);
        return;
      }

      setPaymentError(null);
      const payment = await initiatePayment(user, selectedPackage, formattedPhone);
      setPaymentRequest(payment);
      setPaymentStatus('pending');
      setStatusMessage(t('paymentRequestSent'));
      
      // Start automatic polling for payment status
      startPaymentPolling(payment.orderId!, payment);
    } catch (error: any) {
      const msg = error?.message || JSON.stringify(error) || 'Payment initiation failed';
      console.error('Payment initiation failed:', msg);
      setPaymentError(msg);
      setLoading(false);
    }
  };

  const closePaymentModal = () => {
    // Stop polling if active
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    setShowPaymentModal(false);
    setPaymentRequest(null);
    setSelectedPackage(null);
    setPaymentStatus('pending');
    setStatusMessage('');
    setPaymentError(null);
  };

  const handleCheckStatus = async () => {
    if (!paymentRequest?.orderId) return;

    setPaymentStatus('checking');
    setStatusMessage(t('checkingPaymentStatus'));

    try {
      // 1. Check DB
      const result = await checkPaymentStatus(paymentRequest.orderId);
      
      if (result.success && result.status === 'completed') {
        setPaymentStatus('completed');
        setStatusMessage(t('paymentCompletedSuccessfully'));
        await completePayment(paymentRequest.id);
        await refreshUserData();
        setTimeout(() => { window.location.reload(); }, 2000);
        return;
      }

      if (result.success && result.status === 'failed') {
        setPaymentStatus('failed');
        setStatusMessage(t('paymentFailedGeneric'));
        return;
      }

      // 2. DB still pending — query gateway directly (handles localhost / webhook delays)
      try {
        const statusRes  = await fetch(`/api/payment/status?order_id=${encodeURIComponent(paymentRequest.orderId)}`);
        const statusData = await statusRes.json();
        const gwStatus: string = (statusData.payment_status || '').toUpperCase();

        if (gwStatus === 'COMPLETED') {
          // Status route triggered internal webhook; wait for DB write
          await new Promise(r => setTimeout(r, 1500));
          await completePayment(paymentRequest.id);
          await refreshUserData();
          setPaymentStatus('completed');
          setStatusMessage(t('paymentCompletedSuccessfully'));
          setTimeout(() => { window.location.reload(); }, 2000);
          return;
        } else if (gwStatus === 'FAILED') {
          setPaymentStatus('failed');
          setStatusMessage(t('paymentFailedGeneric'));
          return;
        }
      } catch (_) { /* gateway unreachable */ }

      // Still pending
      setPaymentStatus('pending');
      setStatusMessage(t('paymentRequestSent'));
    } catch (error) {
      console.error('Status check error:', error);
      setPaymentStatus('failed');
      setStatusMessage(t('paymentFailedGeneric'));
    }
  };

  // Automatic payment status polling
  const startPaymentPolling = (orderId: string, paymentReq: PaymentRequest) => {
    let pollCount = 0;
    const maxPolls = 60; // 5 minutes (5 seconds × 60)
    let intervalId: NodeJS.Timeout;
    
    const handlePaymentComplete = async () => {
      clearInterval(intervalId);
      setPollingInterval(null);
      setPaymentStatus('completed');
      setStatusMessage('Payment completed successfully! Your subscription is now active.');
      if (paymentReq) {
        await completePayment(paymentReq.id);
      }
      await refreshUserData();
      const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
      if (redirectUrl) {
        router.push(redirectUrl);
      } else {
        window.location.reload();
      }
    };

    const poll = async () => {
      pollCount++;
      
      try {
        // 1. Check DB first (populated by webhook)
        const result = await checkPaymentStatus(orderId);
        
        if (result.success && result.status === 'completed') {
          await handlePaymentComplete();
          return;
        } else if (result.success && result.status === 'failed') {
          clearInterval(intervalId);
          setPollingInterval(null);
          setPaymentStatus('failed');
          setStatusMessage('Payment failed. Please try again.');
          return;
        }

        // 2. Fallback: query Gateway API directly
        // This works even on localhost where webhook can't be reached.
        // The status route also triggers the internal webhook to update the DB.
        try {
          const statusRes  = await fetch(`/api/payment/status?order_id=${encodeURIComponent(orderId)}`);
          const statusData = await statusRes.json();
          const gwStatus: string = (statusData.payment_status || '').toUpperCase();

          if (gwStatus === 'COMPLETED') {
            // Status route already triggered internal webhook — wait 1s for DB write
            await new Promise(r => setTimeout(r, 1000));
            await handlePaymentComplete();
            return;
          } else if (gwStatus === 'FAILED') {
            clearInterval(intervalId);
            setPollingInterval(null);
            setPaymentStatus('failed');
            setStatusMessage('Payment failed. Please try again.');
            return;
          }
        } catch (_) {
          // Gateway unreachable — continue polling
        }

        if (pollCount >= maxPolls) {
          clearInterval(intervalId);
          setPollingInterval(null);
          setPaymentStatus('failed');
          setStatusMessage('Payment timeout. Please try again.');
        }
        
      } catch (error) {
        console.error('Polling error:', error);
        if (pollCount >= maxPolls) {
          clearInterval(intervalId);
          setPollingInterval(null);
          setPaymentStatus('failed');
          setStatusMessage('Failed to check payment status. Please try again.');
        }
      }
    };
    
    intervalId = setInterval(poll, 5000); // Check every 5 seconds
    setPollingInterval(intervalId);
    
    // Immediate check - don't wait for first interval
    poll();
  };

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="container-mobile space-y-6">
          {/* Header */}
          <div className="text-center py-6">
            <h1 className="text-responsive-2xl font-bold text-gradient mb-2">
              {t('subscriptionPlans')}
            </h1>
            <p className="text-responsive-base text-dark-300">
              {t('choosePerfectPlan')}
            </p>
          </div>


          {/* Current Subscription Status */}
          {subscriptionStatus.isActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-effect rounded-lg p-6"
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-dark-100">
                    Active Subscription
                  </h3>
                  <p className="text-dark-400">
                    {subscriptionStatus.packageType} Package
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-dark-800/50 rounded-lg">
                  <Calendar className="w-6 h-6 mx-auto mb-2 text-primary-400" />
                  <p className="text-sm text-dark-400">{t('daysRemaining')}</p>
                  <p className="text-xl font-bold text-primary-400">
                    {subscriptionStatus.daysRemaining}
                  </p>
                </div>
                <div className="text-center p-4 bg-dark-800/50 rounded-lg">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-primary-400" />
                  <p className="text-sm text-dark-400">{t('expiresOn')}</p>
                  <p className="text-sm font-semibold text-dark-100">
                    {subscriptionStatus.endDate?.toLocaleDateString('en-GB')}
                  </p>
                </div>
              </div>
              
              {/* Live Countdown Timer */}
              {subscriptionStatus.endDate && (
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
                  <div className="text-center mb-3">
                    <h4 className="text-sm font-semibold text-blue-400 mb-2">
                      ⏰ {t('liveCountdown')}
                    </h4>
                  </div>
                  <LiveTimer 
                    endDate={subscriptionStatus.endDate} 
                    variant="detailed"
                    className="text-center"
                    showFullTimestamp={true}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* Subscription Packages */}
          <div className="space-y-4">
            {/* Loading skeletons while config is being fetched */}
            {!packagesConfig && packageOrder.map((_, i) => (
              <div key={i} className="glass-effect rounded-lg p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-dark-700 rounded-full" />
                    <div className="space-y-2">
                      <div className="h-5 w-24 bg-dark-700 rounded" />
                      <div className="h-4 w-16 bg-dark-700 rounded" />
                      <div className="h-6 w-28 bg-dark-700 rounded" />
                    </div>
                  </div>
                  <div className="h-10 w-24 bg-dark-700 rounded-lg" />
                </div>
              </div>
            ))}

            {/* Live dynamic cards from Firestore config */}
            {packagesConfig && packageOrder.map((pkgId, index) => {
              const cfg = packagesConfig[pkgId] ?? SUBSCRIPTION_PACKAGES[pkgId];
              const color = packageColors[pkgId] ?? 'from-primary-500 to-primary-700';
              const durationLabel = cfg.days === 1 ? '1 Siku' : `${cfg.days} Siku`;

              return (
                <motion.div
                  key={pkgId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`glass-effect rounded-lg p-6 ${
                    subscriptionStatus.packageType === pkgId
                      ? 'ring-2 ring-primary-500'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className={`w-16 h-16 bg-gradient-to-br ${color} rounded-full flex items-center justify-center`}>
                        <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-dark-100">
                          {cfg.name}
                        </h3>
                        <p className="text-dark-400">{durationLabel}</p>
                        <p className="text-2xl font-bold text-primary-400">
                          TSH {cfg.price.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {subscriptionStatus.packageType === pkgId && subscriptionStatus.isActive ? (
                      <div className="flex items-center space-x-2 text-green-400">
                        <CheckCircle size={20} />
                        <span className="text-sm font-medium">Active</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(pkgId)}
                        disabled={loading && selectedPackage === pkgId}
                        className="button-primary px-6 py-2"
                      >
                        {loading && selectedPackage === pkgId ? t('loading') : t('subscribe')}
                      </button>
                    )}
                  </div>
                  {cfg.description && (
                    <div className="mt-2 pt-4 border-t border-dark-700/50">
                      <p className="text-sm text-dark-300 whitespace-pre-wrap">{cfg.description}</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Payment History Link */}
          <div className="text-center pt-6 space-y-3">
            <button
              onClick={() => window.location.href = '/subscriptions/history'}
              className="button-secondary"
            >
              <CreditCard size={20} className="mr-2" />
{t('viewPaymentHistory')}
            </button>
            
            {!user && (
              <div className="text-center">
                <p className="text-sm text-dark-400 mb-3">{t('needToTestPayments')}</p>
                <button
                  onClick={() => setShowTestUserModal(true)}
                  className="button-primary text-sm px-4 py-2"
                >
                  {t('createTestUser')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && selectedPackage && (
          <div className="modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="modal-content pb-20 sm:pb-10"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                  <Smartphone size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-dark-100 mb-2">
                  {paymentRequest ? 'Kamilisha Malipo' : 'Thibitisha Malipo'}
                </h3>
                <p className="text-dark-400">
                  Kifurushi cha {selectedPackage} - TSH {(packagesConfig || SUBSCRIPTION_PACKAGES)[selectedPackage!].price.toLocaleString()}
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {/* Phone Number Input/Display */}
                {paymentRequest ? (
                  <div className="p-4 bg-dark-800/50 rounded-lg">
                    <p className="text-sm text-dark-400 mb-2">Taarifa za Mnunuzi</p>
                    <p className="text-dark-100 font-semibold mb-4">
                      {user?.displayName || user?.username || 'Mteja'}
                    </p>
                    <p className="text-sm text-dark-400 mb-2">Nambari ya Simu</p>
                    <p className="text-dark-100 font-semibold">{paymentRequest.phoneNumber}</p>
                  </div>
                ) : (
                  <div className="p-4 bg-dark-800/50 rounded-lg">
                    <p className="text-sm text-dark-400 mb-2">Taarifa za Mnunuzi</p>
                    <p className="text-dark-100 font-semibold mb-4">
                      {user?.displayName || user?.username || 'Mteja'}
                    </p>
                    <label className="text-sm text-dark-400 mb-2 block">Nambari ya Simu</label>
                    <input
                      ref={modalPhoneInputRef}
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Ingiza nambari ya simu (06XXXXXXXX au 07XXXXXXXX)"
                      className="w-full px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                )}

                {/* Jumla ya Malipo */}
                <div className="p-4 bg-dark-800/30 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-dark-300 font-medium">Kifurushi cha {selectedPackage}</span>
                    <span className="text-primary-400 font-bold text-lg">TSH {(packagesConfig || SUBSCRIPTION_PACKAGES)[selectedPackage!].price.toLocaleString()}</span>
                  </div>
                </div>


                {/* Payment Error */}
                {paymentError && (
                  <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/50">
                    <p className="text-sm text-red-400 font-medium mb-1">❌ Hitilafu ya Malipo</p>
                    <p className="text-xs text-red-300">{paymentError}</p>
                  </div>
                )}

                {/* Payment Status */}
                {statusMessage && (
                  <div className={`p-4 rounded-lg ${
                    paymentStatus === 'completed' ? 'bg-green-500/20 border border-green-500/50' :
                    paymentStatus === 'failed' ? 'bg-red-500/20 border border-red-500/50' :
                    paymentStatus === 'checking' ? 'bg-blue-500/20 border border-blue-500/50' :
                    'bg-yellow-500/20 border border-yellow-500/50'
                  }`}>
                    <p className={`text-sm ${
                      paymentStatus === 'completed' ? 'text-green-400' :
                      paymentStatus === 'failed' ? 'text-red-400' :
                      paymentStatus === 'checking' ? 'text-blue-400' :
                      'text-yellow-400'
                    }`}>
                      {statusMessage}
                    </p>
                  </div>
                )}

                {/* Payment Warnings - Only show minimum amount warning, not phone number warning */}
                {paymentRequest && (
                  <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <span className="text-lg">💰</span>
                      <div className="text-sm text-yellow-200">
                        <strong>Hakikisha una salio la kutosha kwenye simu yako kabla ya kuthibitisha.</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Instructions - Only show after payment is initiated */}
                {paymentRequest && (
                  <div className="text-center text-sm text-dark-400">
                    <div className="space-y-2">
                      <p>📱 Angalia simu yako kwa ombi la malipo</p>
                      <p>💳 Ingiza PIN yako ya simu kuidhinisha</p>
                      <p>⏳ Subiri uthibitisho wa malipo</p>
                    </div>
                    <p className="mt-3 text-xs text-dark-500">Usajili wako utaamilishwa mara malipo yakikamilika.</p>
                    {pollingInterval && (
                      <div className="mt-3 flex items-center justify-center space-x-2 text-primary-400">
                        <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs">Inathibitisha hali ya malipo...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                {paymentRequest ? (
                  <>
                    <button
                      onClick={closePaymentModal}
                      className="button-secondary flex-1"
                    >
                      Funga
                    </button>
                    <button
                      onClick={handleCheckStatus}
                      disabled={paymentStatus === 'checking' || paymentStatus === 'completed'}
                      className="button-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {paymentStatus === 'checking' ? 'Inaangalia...' : 'Angalia Hali'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={closePaymentModal}
                      className="button-secondary flex-1"
                    >
                      Ghairi
                    </button>
                    <button
                      onClick={handleConfirmPayment}
                      disabled={loading}
                      className="button-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Inashughulikia...
                        </>
                      ) : (
                        'Thibitisha & Lipa'
                      )}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Test User Modal */}
        {showTestUserModal && (
          <div className="modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="modal-content"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                  <User size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-dark-100 mb-2">
                  Create Test User
                </h3>
                <p className="text-dark-400">
                  This will create a test user for development purposes
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-4 bg-dark-800/50 rounded-lg">
                  <p className="text-sm text-dark-400 mb-2">{t('testUserDetails')}</p>
                  <p className="text-dark-100 font-semibold">Phone: +255788672140</p>
                  <p className="text-dark-100 font-semibold">Username: testuser</p>
                  <p className="text-dark-100 font-semibold">Name: Test User</p>
                </div>

                <div className="text-center text-sm text-dark-400">
                  <p>This user will be created in the database and you can use it to test payments.</p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowTestUserModal(false)}
                  className="button-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={createTestUser}
                  className="button-primary flex-1"
                >
                  Create Test User
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </MainLayout>
    </ProtectedRoute>
  );
}
