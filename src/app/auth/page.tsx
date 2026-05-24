'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Phone, User, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

function AuthContent() {
  const { signInWithPhone, checkPhoneExists, checkUsernameExists } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<'phone' | 'newUser' | 'qr'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrStatus, setQrStatus] = useState<'claiming' | 'success' | 'error'>('claiming');
  const [qrMessage, setQrMessage] = useState('');

  const [formData, setFormData] = useState({
    phoneNumber: '',
    username: '',
    displayName: ''
  });

  // ── QR deep-link auto-login ─────────────────────────────────────────────────
  useEffect(() => {
    const qrToken = searchParams?.get('qr');
    if (!qrToken) return;
    setStep('qr');
    setQrStatus('claiming');
    setQrMessage('Connecting your device...');

    const DEVICE_SESSION_KEY = 'raha_device_session_id';
    const deviceId = localStorage.getItem(DEVICE_SESSION_KEY) || crypto.randomUUID();
    localStorage.setItem(DEVICE_SESSION_KEY, deviceId);

    const ua = navigator.userAgent;
    let label = 'Browser';
    if (/Android/i.test(ua)) label = 'Android Device';
    else if (/iPhone|iPad/i.test(ua)) label = 'iOS Device';
    else if (/Windows/i.test(ua)) label = 'Windows PC';
    else if (/Mac/i.test(ua)) label = 'Mac';

    fetch('/api/qr/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: qrToken, deviceId, deviceLabel: label }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          localStorage.setItem('supabase_uid', data.userId);
          localStorage.setItem('supabase_phone', data.phoneNumber);
          setQrStatus('success');
          setQrMessage('Device connected! Redirecting...');
          setTimeout(() => router.push('/'), 1500);
        } else {
          setQrStatus('error');
          setQrMessage(data.error || 'QR code is invalid or expired.');
        }
      })
      .catch(() => {
        setQrStatus('error');
        setQrMessage('Connection failed. Please try again.');
      });
  }, [searchParams, router]);
  // ────────────────────────────────────────────────────────────────────────────

  const getRedirectUrl = () => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const redirect = searchParams.get('redirect');
      if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
        return redirect;
      }
    }
    return '/';
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const tanzanianPhoneRegex = /^(\+255|0)(6|7)\d{8}$/;
    return tanzanianPhoneRegex.test(phone);
  };

  const formatPhoneNumber = (phone: string): string => {
    if (phone.startsWith('0')) {
      return `+255${phone.substring(1)}`;
    }
    return phone;
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!validatePhoneNumber(formData.phoneNumber)) {
        setError(t('validPhoneNumber'));
        return;
      }

      const formattedPhone = formatPhoneNumber(formData.phoneNumber);
      const phoneExists = await checkPhoneExists(formattedPhone);

      if (phoneExists) {
        try {
          await signInWithPhone(formattedPhone);
          router.push(getRedirectUrl());
        } catch (authError: any) {
          if (authError.message === 'ACCOUNT_BLOCKED') {
            setError(t('accountBlockedContact'));
          } else {
            setError(t('loginFailedRetry'));
          }
        }
      } else {
        setFormData({ ...formData, phoneNumber: formattedPhone });
        setStep('newUser');
      }
    } catch (error: any) {
      setError(t('failedCheckPhone'));
    } finally {
      setLoading(false);
    }
  };

  const handleNewUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.displayName.trim()) {
        setError(t('enterName'));
        return;
      }

      let baseUsername = formData.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (baseUsername.length === 0) {
        baseUsername = 'user';
      }
      
      let finalUsername = baseUsername;
      let counter = 1;
      
      while (true) {
        const usernameExists = await checkUsernameExists(finalUsername);
        if (!usernameExists) {
          break;
        }
        finalUsername = `${baseUsername}${counter}`;
        counter++;
      }

      await signInWithPhone(formData.phoneNumber, finalUsername, formData.displayName);
      router.push(getRedirectUrl());
    } catch (error: any) {
      setError(t('registrationFailed'));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-main-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-primary-gradient rounded-full flex items-center justify-center relative">
            <Image
              src="/logo.png"
              alt="RahaPremium"
              width={40}
              height={40}
              className="w-10 h-10 object-contain"
              priority
              unoptimized
              onError={(e) => {
                // Fallback if logo fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <span className="text-white font-bold text-2xl hidden">R</span>
          </div>
          <h1 className="text-3xl flex items-center justify-center tracking-tight">
            <span className="font-black text-white">Raha</span>
            <span className="font-black text-blue-500">Premium</span>
          </h1>
          <p className="text-dark-300 mt-2">{t('premiumEntertainment')}</p>
        </div>


        {/* Auth Form */}
        <div className="glass-effect rounded-lg p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* QR Deep-Link Step */}
          {step === 'qr' && (
            <div className="flex flex-col items-center gap-5 py-4">
              {qrStatus === 'claiming' && (
                <>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.2)' }}>
                    <Loader2 size={32} className="text-purple-400 animate-spin" />
                  </div>
                  <p className="text-dark-100 font-semibold text-lg">Connecting Device...</p>
                  <p className="text-dark-400 text-sm text-center">{qrMessage}</p>
                </>
              )}
              {qrStatus === 'success' && (
                <>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.2)' }}>
                    <CheckCircle size={32} className="text-green-400" />
                  </div>
                  <p className="text-green-400 font-bold text-xl">Connected!</p>
                  <p className="text-dark-400 text-sm text-center">{qrMessage}</p>
                </>
              )}
              {qrStatus === 'error' && (
                <>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.2)' }}>
                    <AlertCircle size={32} className="text-red-400" />
                  </div>
                  <p className="text-red-400 font-bold text-lg">Connection Failed</p>
                  <p className="text-dark-400 text-sm text-center">{qrMessage}</p>
                  <button onClick={() => { setStep('phone'); setError(''); }}
                    className="button-primary w-full mt-2">
                    Login Manually
                  </button>
                </>
              )}
            </div>
          )}

          {/* Phone Number Step */}
          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-dark-100 mb-2">
                  {t('login')}
                </h2>
                <p className="text-dark-400 text-sm">
                  {t('enterPhoneNumber')}
                </p>
              </div>

              <div>
                <label className="form-label flex items-center space-x-2">
                  <Phone size={16} />
                  <span>{t('phoneNumber')}</span>
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="form-input"
                  placeholder="06XXXXXXXX or 07XXXXXXXX"
                  required
                />
                <p className="text-xs text-dark-500 mt-1">
                  {t('phoneFormat')}
                </p>
              </div>



              <button
                type="submit"
                disabled={loading}
                className="button-primary w-full"
              >
                {loading ? t('loading') : t('continue')}
              </button>

              <div className="mt-6 border-t border-dark-700 pt-6">
                <button
                  type="button"
                  onClick={() => router.push('/auth/qr')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-dark-800 text-dark-100 border border-dark-700/60 hover:bg-dark-700 hover:text-white transition-all text-sm font-semibold"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="7" y="7" width="3" height="3"></rect><rect x="14" y="7" width="3" height="3"></rect><rect x="7" y="14" width="3" height="3"></rect><rect x="14" y="14" width="3" height="3"></rect></svg>
                  Log in via QR Code
                </button>
              </div>
            </form>
          )}



          {/* New User Registration */}
          {step === 'newUser' && (
            <form onSubmit={handleNewUserSubmit} className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-dark-100 mb-2">
                  {t('createAccount')}
                </h2>
                <p className="text-dark-400 text-sm">
                  {t('phoneNumber')}: {formData.phoneNumber}
                </p>
                <p className="text-dark-400 text-sm">
                  {t('completeRegistration')}
                </p>
              </div>



              <div>
                <label className="form-label">
                  {t('name')} *
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="form-input"
                  placeholder={t('enterFullName')}
                  required
                />
              </div>

              {/* Username is auto-generated in the background based on the user's name */}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="button-secondary flex-1"
                >
                  {t('back')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="button-primary flex-1"
                >
                  {loading ? t('loading') : t('createAccount')}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-dark-500">
          <p>&copy; {new Date().getFullYear()} RahaPremium. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-main-gradient flex items-center justify-center p-4">
        <Loader2 className="animate-spin text-purple-400" size={48} />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
