'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Smartphone, Loader2, ArrowLeft, Play, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getMovieById } from '@/lib/content';
import { initiateContentPayment, checkPaymentStatus, completePayment } from '@/lib/subscriptions';
import Image from 'next/image';

function PayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUserData } = useAuth();
  
  const contentId = searchParams.get('contentId');
  const type = searchParams.get('type') || 'adult';
  
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);

  // Pre-fill phone only once on mount — never overwrite what the user typed
  useEffect(() => {
    setPhoneNumber(prev => {
      if (prev !== '') return prev; // user already typed something, keep it
      if (user?.phoneNumber) {
        let phone = user.phoneNumber;
        if (phone.startsWith('+255')) phone = '0' + phone.substring(4);
        else if (phone.startsWith('255')) phone = '0' + phone.substring(3);
        return phone;
      }
      // Fallback to last used phone saved in localStorage
      return localStorage.getItem('lastUsedPhone') || '';
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchContent = async () => {
      if (!contentId) {
        setError('Content ID is missing');
        setLoading(false);
        return;
      }
      
      try {
        const data = await getMovieById(contentId);
        if (!data) {
          setError('Content not found');
        } else if (!data.contentPurchaseEnabled || !data.contentPrice) {
          setError('This content is not available for individual purchase');
        } else {
          setContent(data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load content details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchContent();
  }, [contentId]);

  // Poll for payment status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (orderId && paymentStatus === 'processing') {
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes (5s interval)

      const handleSuccess = async (paymentId?: string) => {
        clearInterval(pollInterval);
        setPaymentStatus('success');
        setPaymentMessage('Malipo yamekamilika! Inaandaa maudhui...');

        // Poll DB until the webhook has written content_accesses (up to 10s)
        let accessConfirmed = false;
        const { supabase: sbClient } = await import('@/lib/supabase');
        if (contentId) {
          for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { data } = await sbClient
              .from('rahapremium_users')
              .select('content_accesses')
              .eq('id', user?.uid || '')
              .single();
            if (data?.content_accesses?.includes(contentId)) {
              accessConfirmed = true;
              break;
            }
          }
        }

        // ── FALLBACK: webhook never fired (e.g. localhost) ─────────────────────
        // If DB still doesn't show access, force-complete via:
        // 1. Trigger the status route (which calls the internal webhook as fallback)
        // 2. Also call completePayment() directly so content_accesses is written
        if (!accessConfirmed && orderId) {
          try {
            // Step 1: trigger status route fallback webhook
            await fetch(`/api/payment/status?order_id=${encodeURIComponent(orderId)}`);
            // Wait briefly for the internal webhook to write to DB
            await new Promise(r => setTimeout(r, 2000));

            // Step 2: find the payment record and force-complete it client-side
            const { data: paymentRows } = await sbClient
              .from('payments')
              .select('id, status')
              .eq('order_id', orderId)
              .single();

            if (paymentRows && paymentRows.status !== 'completed') {
              await completePayment(paymentRows.id);
              console.log('[pay] Force-completed payment in DB:', paymentRows.id);
            }
          } catch (e) {
            console.error('[pay] Fallback completePayment error:', e);
          }
        }
        // ───────────────────────────────────────────────────────────────────────

        // Refresh auth context with fresh data (picks up new content_accesses)
        await refreshUserData();

        // Navigate with ?paid=true so content page auto-plays immediately
        let redirectPath = `/${type === 'adult' ? 'adult/watch' : 'movies'}/${contentId}?paid=true`;
        if (type === 'live') redirectPath = '/live-tv';
        else if (type === 'series' || type === 'episode') redirectPath = `/series/${contentId}?paid=true`;
        router.push(redirectPath);
      };

      pollInterval = setInterval(async () => {
        attempts++;
        try {
          // 1. Check our DB first (populated by webhook)
          const dbResult = await checkPaymentStatus(orderId);

          if (dbResult.success && dbResult.status === 'completed') {
            await handleSuccess(dbResult.paymentId);
            return;
          }
          if (dbResult.success && dbResult.status === 'failed') {
            clearInterval(pollInterval);
            setPaymentStatus('failed');
            setPaymentMessage('Malipo yameshindwa. Tafadhali jaribu tena.');
            setIsProcessing(false);
            return;
          }

          // 2. Webhook may not have fired (e.g. localhost) — ask Gateway directly
          try {
            const gwRes = await fetch(`/api/payment/status?order_id=${orderId}`);
            const gwData = await gwRes.json();
            const gwStatus: string = gwData.payment_status || '';

            if (gwStatus === 'COMPLETED') {
              await handleSuccess();
              return;
            } else if (gwStatus === 'FAILED') {
              clearInterval(pollInterval);
              setPaymentStatus('failed');
              setPaymentMessage('Malipo yameshindwa. Tafadhali jaribu tena.');
              setIsProcessing(false);
              return;
            }
          } catch (_) {
            // Gateway check failed — continue polling
          }

          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setPaymentStatus('failed');
            setPaymentMessage('Muda wa malipo umeisha. Tafadhali jaribu tena.');
            setIsProcessing(false);
          }
        } catch (error) {
          console.error('Error polling payment status:', error);
        }
      }, 5000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [orderId, paymentStatus, router, contentId, type]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content || !contentId) return;

    setError('');
    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      // 1. Format phone number (ensure it starts with 0)
      let formattedPhone = phoneNumber.replace(/\s+/g, '');
      if (formattedPhone.startsWith('+255')) {
        formattedPhone = '0' + formattedPhone.substring(4);
      } else if (formattedPhone.startsWith('255')) {
        formattedPhone = '0' + formattedPhone.substring(3);
      }

      // 2. Validate Tanzania networks
      if (!/^0[67][0-9]{8}$/.test(formattedPhone)) {
        throw new Error('Tafadhali weka namba sahihi ya simu (mf. 07XXXXXXXX)');
      }

      // Save valid phone number for next time
      localStorage.setItem('lastUsedPhone', formattedPhone);

      // 3. Initiate payment
      const mappedType = ['movie', 'series', 'episode', 'story'].includes(type) 
        ? (type as 'movie' | 'series' | 'episode' | 'story') 
        : 'movie';

      const payment = await initiateContentPayment(
        user,
        contentId,
        mappedType,
        formattedPhone,
        content.contentPrice,
        content.contentPriceDays || 3
      );

      if (payment.orderId) {
        setOrderId(payment.orderId);
        setPaymentMessage('Tafadhali weka PIN yako kwenye simu yako kukamilisha malipo...');
      } else {
        throw new Error('Kuna tatizo katika kuanzisha malipo.');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Malipo yameshindwa. Tafadhali jaribu tena.');
      setPaymentStatus('failed');
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-zinc-400">Inaleta taarifa...</p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Imeshindwa</h2>
          <p className="text-zinc-400 mb-6">{error || 'Taarifa hazijapatikana'}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            Rudi Nyuma
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Nunua Kutazama</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">


        {/* Payment Form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary-500" />
            Lipa kwa Mitandao ya Simu
          </h3>

          {content && (
            <div className="mb-4 p-4 bg-zinc-800/50 rounded-xl">
              <p className="text-sm text-zinc-400 mb-1">Unacholipa (Kutazama)</p>
              <p className="text-white font-medium">{content.title}</p>
            </div>
          )}

          {user && (
            <div className="mb-6 p-4 bg-zinc-800/50 rounded-xl">
              <p className="text-sm text-zinc-400 mb-1">Taarifa za Mnunuzi</p>
              <p className="text-white font-medium">{user.displayName || user.username || 'Mteja'}</p>
            </div>
          )}

          <form onSubmit={handlePayment} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Namba ya Simu (Tigo Pesa, M-Pesa, Airtel Money, Halopesa)
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Mfano: 0712345678"
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                disabled={isProcessing}
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-500 text-center">{error}</p>
              </div>
            )}

            {/* Success/Processing Message */}
            {paymentStatus === 'processing' && (
              <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                <p className="text-sm text-primary-500 text-center font-medium">
                  {paymentMessage}
                </p>
              </div>
            )}

            {paymentStatus === 'success' && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <p className="text-sm text-green-500 text-center font-medium">
                  {paymentMessage}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing || paymentStatus === 'success'}
              className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Inachakata...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Lipa Tsh {content.contentPrice.toLocaleString()}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    }>
      <PayContent />
    </Suspense>
  );
}
