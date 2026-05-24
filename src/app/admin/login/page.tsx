'use client';

import React, { useState, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

function AdminLoginContent() {
  const { signInWithEmail, adminUser } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/admin';

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Reactively redirect once adminUser is set to avoid race conditions with ProtectedRoute
  React.useEffect(() => {
    if (adminUser) {
      router.push(redirectUrl);
    }
  }, [adminUser, router, redirectUrl]);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmail(formData.email, formData.password);
      // The useEffect will handle the redirect once the auth context state is updated
    } catch (error: any) {
      if (error.message === 'ADMIN_NOT_FOUND') {
        setError(t('adminNotFound'));
      } else if (error.message === 'ADMIN_DEACTIVATED') {
        setError(t('adminDeactivated'));
      } else {
        setError(t('adminLoginFailed'));
      }
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 bg-red-gradient rounded-full flex items-center justify-center relative">
          <Shield size={40} className="text-white" />
        </div>
        <h1 className="text-3xl flex items-center justify-center tracking-tight">
          <span className="font-black text-white">Raha</span>
          <span className="font-black text-blue-500">Premium</span>
        </h1>
        <h2 className="text-xl font-semibold text-red-400 mt-2">Admin Panel</h2>
        <p className="text-dark-300 mt-2">Administrator Access Only</p>
      </div>

      {/* Admin Login Form */}
      <div className="glass-effect rounded-lg p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleAdminSubmit} className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-dark-100 mb-2">
              {t('adminLogin')}
            </h2>
            <p className="text-dark-400 text-sm">
              {t('enterAdminCredentials')}
            </p>
          </div>

          <div>
            <label className="form-label flex items-center space-x-2">
              <Mail size={16} />
              <span>{t('email')}</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="form-input"
              placeholder="admin@rahapremium.com"
              required
            />
          </div>

          <div>
            <label className="form-label flex items-center space-x-2">
              <Lock size={16} />
              <span>{t('password')}</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="form-input pr-12"
                placeholder="Enter admin password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-400 hover:text-dark-200"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="button-primary w-full"
          >
            {loading ? t('loading') : t('adminLogin')}
          </button>

          <div className="text-center mt-4">
            <a
              href="/"
              className="text-sm text-dark-400 hover:text-primary-400 transition-colors"
            >
              ← Back to Homepage
            </a>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="text-center mt-6 text-sm text-dark-500">
        <p>&copy; {new Date().getFullYear()} RahaPremium. Admin Access Portal.</p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-main-gradient flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-white">Loading...</div>}>
        <AdminLoginContent />
      </Suspense>
    </div>
  );
}
