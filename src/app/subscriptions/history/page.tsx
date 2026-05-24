'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  ArrowLeft, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock,
  CreditCard,
  Calendar,
  Smartphone
} from 'lucide-react';
import { PaymentRequest, UserSubscription } from '@/types';
import { motion } from 'framer-motion';
import Link from 'next/link';
import LiveTimer from '@/components/ui/LiveTimer';
import { Loading } from '@/components/ui/Loading';

export default function PaymentHistoryPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'payments' | 'subscriptions'>('payments');

  useEffect(() => {
    if (user) {
      // Load user's payment history and subscriptions
      setPayments(user.paymentHistory || []);
      setSubscriptions(user.subscriptionHistory || []);
      setLoading(false);
    }
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} className="text-green-400" />;
      case 'failed':
        return <XCircle size={20} className="text-red-400" />;
      case 'pending':
        return <Clock size={20} className="text-yellow-400" />;
      default:
        return <Clock size={20} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const generateReceipt = (payment: PaymentRequest) => {
    const receiptData = {
      transactionId: payment.id,
      packageType: payment.packageType,
      amount: payment.amount,
      phoneNumber: payment.phoneNumber,
      status: payment.status,
      date: payment.createdAt,
      completedDate: payment.completedAt
    };

    const receiptContent = `
RAHAPREMIUM RECEIPT
==================
Transaction ID: ${receiptData.transactionId}
Package: ${receiptData.packageType}
Amount: TSH ${receiptData.amount.toLocaleString()}
Phone: ${receiptData.phoneNumber}
Status: ${receiptData.status.toUpperCase()}
Date: ${new Date(receiptData.date).toLocaleString()}
${receiptData.completedDate ? `Completed: ${new Date(receiptData.completedDate).toLocaleString()}` : ''}

Thank you for using RahaPremium!
==================
    `;

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RahaPremium_Receipt_${payment.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="container-mobile space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Link
                href="/subscriptions"
                className="touch-button text-dark-400 hover:text-dark-100 transition-colors duration-200"
              >
                <ArrowLeft size={24} />
              </Link>
              <div>
                <h1 className="text-responsive-2xl font-bold text-gradient">
                  {t('paymentHistory')}
                </h1>
                <p className="text-responsive-base text-dark-300">
                  {t('viewPaymentHistory')}
                </p>
              </div>
            </div>
            
          </div>

          {/* Tabs */}
          <div className="flex glass-effect rounded-lg p-1">
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                activeTab === 'payments'
                  ? 'bg-primary-gradient text-white shadow-lg'
                  : 'text-dark-300 hover:text-dark-100'
              }`}
            >
              <CreditCard size={16} />
              <span>{t('payments')}</span>
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                activeTab === 'subscriptions'
                  ? 'bg-primary-gradient text-white shadow-lg'
                  : 'text-dark-300 hover:text-dark-100'
              }`}
            >
              <Calendar size={16} />
              <span>{t('subscriptions')}</span>
            </button>
          </div>

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              {payments.length === 0 ? (
                <div className="glass-effect rounded-lg p-8 text-center">
                  <CreditCard size={48} className="mx-auto text-dark-600 mb-4" />
                  <h3 className="text-lg font-semibold text-dark-300 mb-2">
                    {t('noPaymentHistory')}
                  </h3>
                  <p className="text-dark-400">
                    {t('noPaymentsYet')}
                  </p>
                </div>
              ) : (
                payments.map((payment, index) => (
                  <motion.div
                    key={payment.id || `payment-${index}-${payment.createdAt ? new Date(payment.createdAt).getTime() : Date.now()}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="glass-effect rounded-lg p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-primary-gradient rounded-full flex items-center justify-center">
                          {getStatusIcon(payment.status)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-dark-100">
                            {payment.packageType ? `${payment.packageType} Package` : payment.gameId ? 'Game Payment' : 'Payment'}
                          </h3>
                          <p className="text-dark-400 text-sm">
                            {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary-400">
                          TSH {payment.amount.toLocaleString()}
                        </p>
                        <p className={`text-sm font-medium capitalize ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-dark-300">
                        <Smartphone size={16} />
                        <span>{payment.phoneNumber}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-dark-300">
                        <span className="text-dark-500">ID:</span>
                        <span className="font-mono">{payment.id ? payment.id.substring(0, 8) + '...' : 'N/A'}</span>
                      </div>
                    </div>

                    {payment.isManuallyCompleted && (
                      <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                        <p className="text-blue-400 text-sm">
                          ✓ {t('manuallyCompletedByAdmin')}
                        </p>
                      </div>
                    )}

                    {payment.failureReason && (
                      <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                        <p className="text-red-400 text-sm">
                          ✗ {payment.failureReason}
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        onClick={() => generateReceipt(payment)}
                        className="button-secondary text-sm px-4 py-2 flex items-center space-x-2"
                      >
                        <Download size={16} />
                        <span>{t('downloadReceipt')}</span>
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Subscriptions Tab */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-4">
              {subscriptions.length === 0 ? (
                <div className="glass-effect rounded-lg p-8 text-center">
                  <Calendar size={48} className="mx-auto text-dark-600 mb-4" />
                  <h3 className="text-lg font-semibold text-dark-300 mb-2">
                    No Subscription History
                  </h3>
                  <p className="text-dark-400">
                    You haven't subscribed to any packages yet
                  </p>
                </div>
              ) : (
                subscriptions.map((subscription, index) => (
                  <motion.div
                    key={subscription.id || `subscription-${index}-${subscription.createdAt ? new Date(subscription.createdAt).getTime() : Date.now()}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`glass-effect rounded-lg p-6 ${
                      subscription.isActive ? 'ring-2 ring-green-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          subscription.isActive ? 'bg-green-500' : 'bg-gray-500'
                        }`}>
                          {subscription.isActive ? (
                            <CheckCircle size={24} className="text-white" />
                          ) : (
                            <XCircle size={24} className="text-white" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-dark-100">
                            {subscription.packageType} Package
                          </h3>
                          <p className="text-dark-400 text-sm">
                            {new Date(subscription.startDate).toLocaleDateString('en-GB')} - {new Date(subscription.endDate).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary-400">
                          TSH {subscription.amount.toLocaleString()}
                        </p>
                        <p className={`text-sm font-medium ${
                          subscription.isActive ? 'text-green-400' : 'text-gray-400'
                        }`}>
                          {subscription.isActive ? t('active') : t('expired')}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-sm">
                      {subscription.isRenewal && (
                        <div className="flex items-center space-x-2 text-blue-400">
                          <span>🔄</span>
                          <span>{t('renewal')}</span>
                        </div>
                      )}
                      {subscription.isUpgrade && (
                        <div className="flex items-center space-x-2 text-purple-400">
                          <span>⬆️</span>
                          <span>{t('upgrade')}</span>
                        </div>
                      )}
                      {subscription.previousPackage && (
                        <div className="text-dark-400">
                          <span>{t('from')}: {subscription.previousPackage}</span>
                        </div>
                      )}
                    </div>

                    {subscription.isActive && (
                      <div className="space-y-3">
                        <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                          <p className="text-green-400 text-sm">
                            ✓ {t('currentlyActive')}
                          </p>
                        </div>
                        
                        {/* Live Countdown Timer for Active Subscriptions */}
                        <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
                          <div className="text-center mb-3">
                            <h4 className="text-sm font-semibold text-blue-400 mb-2">
                              ⏰ {t('liveCountdown')}
                            </h4>
                          </div>
                          <LiveTimer 
                            endDate={subscription.endDate} 
                            variant="detailed"
                            className="text-center"
                            showFullTimestamp={true}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
