'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { User, Edit2, Camera, Phone, Globe, LogOut, Loader2, QrCode, ScanLine } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ImageUploadInput } from '@/components/ui/ImageUploadInput';
import QRConnectModal from '@/components/QRConnectModal';

export default function ProfilePage() {
  const { t, language, setLanguage } = useLanguage();
  const { user, adminUser, signOut, updateUserProfile, loading } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrInitialTab, setQrInitialTab] = useState<'myqr' | 'scan'>('myqr');

  const openQR = (tab: 'myqr' | 'scan') => {
    setQrInitialTab(tab);
    setQrModalOpen(true);
  };
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    displayName: '',
    username: '',
    phoneNumber: '',
    profilePhotoURL: '',
  });

  // Update edit data when user data changes
  useEffect(() => {
    if (user) {
      setEditData({
        displayName: user.displayName || '',
        username: user.username || '',
        phoneNumber: user.phoneNumber || '',
        profilePhotoURL: user.profilePhotoURL || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      await updateUserProfile({
        displayName: editData.displayName,
        username: editData.username,
        phoneNumber: editData.phoneNumber,
        profilePhotoURL: editData.profilePhotoURL || null,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      // You could add a toast notification here
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setEditData({
        displayName: user.displayName || '',
        username: user.username || '',
        phoneNumber: user.phoneNumber || '',
        profilePhotoURL: user.profilePhotoURL || '',
      });
    }
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Redirect if not logged in (using useEffect to avoid setState in render errors)
  useEffect(() => {
    if (!loading && !user && !adminUser) {
      router.push('/auth');
    }
  }, [user, adminUser, loading, router]);

  // Show loading state
  if (loading) {
    return (
      <MainLayout>
        <div className="container-mobile flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-dark-300">Loading profile...</p>
          </div>
        </div>
      </MainLayout>
    );
  }


  if (!user && !adminUser) {
    return null;
  }

  // Use admin data if admin user, otherwise use regular user data
  const currentUser = adminUser || user;
  const isAdmin = !!adminUser;

  return (
    <MainLayout>
      <div className="container-mobile space-y-8">
        {/* QR Modal */}
        {!isAdmin && (
          <QRConnectModal
            isOpen={qrModalOpen}
            onClose={() => setQrModalOpen(false)}
            initialTab={qrInitialTab}
          />
        )}

        {/* Profile Header */}
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-primary-gradient rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={40} className="text-white" />
          </div>
          <h1 className="text-responsive-3xl font-bold text-gradient mb-3">
            {isAdmin ? 'Admin Profile' : t('profile')}
          </h1>
          <p className="text-responsive-lg text-dark-300">
            {isAdmin ? 'Administrator Account' : t('editProfile')}
          </p>

          {/* QR Connect Buttons — non-admin users only */}
          {!isAdmin && (
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={() => openQR('myqr')}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}
              >
                <QrCode size={16} />
                My QR Code
              </button>
              <button
                onClick={() => router.push('/auth/scan')}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <ScanLine size={16} />
                Linked Devices
              </button>
            </div>
          )}
        </div>

        {/* Main Profile Information Card */}
        <div className="glass-effect rounded-xl p-8">
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center mb-10">
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full bg-primary-gradient flex items-center justify-center overflow-hidden shadow-2xl">
                {!isAdmin && user?.profilePhotoURL ? (
                  <Image
                    src={user.profilePhotoURL}
                    alt={user.displayName || 'User'}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to default icon if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <User size={60} className="text-white" />
              </div>
              {isEditing && !isAdmin && (
                <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white hover:bg-primary-500 transition-all duration-200 shadow-lg cursor-pointer">
                  {saving ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={saving}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setSaving(true);
                      try {
                        const formData = new FormData();
                        formData.append('image', file);
                        const response = await fetch('https://api.imgbb.com/1/upload?key=a02885adfe42eeadbd4b388596a1849a', {
                          method: 'POST',
                          body: formData,
                        });
                        const data = await response.json();
                        if (data.success) {
                          setEditData({ ...editData, profilePhotoURL: data.data.url });
                        }
                      } catch (error) {
                        console.error('Error uploading image:', error);
                        alert('Error uploading image. Please try again.');
                      } finally {
                        setSaving(false);
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {/* Profile Photo URL Input (only when editing) */}
            {isEditing && !isAdmin && (
              <div className="w-full max-w-md">
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  Profile Photo URL
                </label>
                <ImageUploadInput
                  value={editData.profilePhotoURL}
                  onChange={(url) => setEditData({ ...editData, profilePhotoURL: url })}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="https://example.com/photo.jpg"
                />
                <p className="text-xs text-dark-400 mt-2 text-center">
                  Enter a direct image URL (e.g., from imgur, Google Drive, etc.)
                </p>
              </div>
            )}
          </div>

          {/* Profile Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Basic Info */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-dark-100 mb-6 flex items-center">
                <User size={20} className="mr-3 text-primary-400" />
                Basic Information
              </h3>

              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  {isAdmin ? 'Admin Name' : t('name')}
                </label>
                {isEditing && !isAdmin ? (
                  <input
                    type="text"
                    value={editData.displayName}
                    onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your name"
                  />
                ) : (
                  <div className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg text-dark-300 cursor-not-allowed">
                    {currentUser?.displayName || 'Not set'}
                  </div>
                )}
              </div>

              {/* Username Field */}
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  {t('username')}
                </label>
                {isEditing && !isAdmin ? (
                  <input
                    type="text"
                    value={editData.username}
                    onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter username"
                  />
                ) : (
                  <div className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg text-dark-300 cursor-not-allowed">
                    @{!isAdmin ? user?.username || 'Not set' : 'Admin'}
                  </div>
                )}
              </div>

              {/* Phone Number Field (Editable) */}
              {!isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2 flex items-center">
                    <Phone size={16} className="mr-2 text-primary-400" />
                    {t('phoneNumber')}
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editData.phoneNumber}
                      onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      placeholder="e.g. +255712345678"
                    />
                  ) : (
                    <div className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg text-dark-300 cursor-not-allowed">
                      {user?.phoneNumber || 'Not set'}
                    </div>
                  )}
                </div>
              )}

              {/* Email Field (for admin) */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">
                    Email
                  </label>
                  <div className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg text-dark-400 cursor-not-allowed">
                    {isAdmin ? adminUser?.email || 'Not set' : 'Not set'}
                    <span className="text-xs ml-2 text-dark-500">(Admin email)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Settings & Preferences */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-dark-100 mb-6 flex items-center">
                <Globe size={20} className="mr-3 text-primary-400" />
                Settings & Preferences
              </h3>

              {/* Language Selection */}
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-4">
                  {t('language')}
                </label>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'en' | 'sw')}
                    className="w-full px-4 py-4 bg-dark-800 border border-dark-600 rounded-xl text-dark-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer pr-12"
                  >
                    <option value="sw" className="bg-dark-800 text-dark-100">
                      🇹🇿 Kiswahili
                    </option>
                    <option value="en" className="bg-dark-800 text-dark-100">
                      🇺🇸 English
                    </option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <Globe size={20} className="text-primary-400" />
                  </div>
                </div>
                <p className="text-xs text-dark-400 mt-2">
                  Select your preferred language for the interface
                </p>
              </div>

            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-10 pt-8 border-t border-dark-700">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="button-primary flex-1 flex items-center justify-center space-x-2 py-4 text-lg font-semibold"
                >
                  {saving ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>{t('save')}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="button-secondary flex-1 py-4 text-lg font-semibold"
                >
                  {t('cancel')}
                </button>
              </>
            ) : (
              <>
                {!isAdmin && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="button-primary flex-1 flex items-center justify-center space-x-2 py-4 text-lg font-semibold"
                  >
                    <Edit2 size={20} />
                    <span>{t('editProfile')}</span>
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="button-danger flex-1 flex items-center justify-center space-x-2 py-4 text-lg font-semibold"
                >
                  <LogOut size={20} />
                  <span>Logout</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Subscription Status */}
        {!isAdmin && (
          <div className="glass-effect rounded-xl p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-accent-gradient rounded-full flex items-center justify-center mr-4">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-dark-100">
                  {t('currentPlan')}
                </h2>
                <p className="text-dark-400">Manage your subscription</p>
              </div>
            </div>
            
            <div className="text-center py-8">
              {user?.subscription && typeof user.subscription === 'object' && 'packageType' in user.subscription && user.subscription.packageType ? (
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 bg-accent-gradient rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <span className="text-white font-bold text-2xl">
                      {String(user.subscription.packageType).charAt(0)}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gradient mb-3">
                    {String(user.subscription.packageType)}
                  </h3>
                  <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold mb-4 ${
                    (user.subscription as any).isActive 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {(user.subscription as any).isActive ? 'Active' : 'Expired'}
                  </div>
                  <p className="text-dark-300 mb-6">
                    {t('expiresOn')}: <span className="font-semibold text-dark-100">{(user.subscription as any).endDate ? new Date((user.subscription as any).endDate).toLocaleDateString() : 'N/A'}</span>
                  </p>
                  <button 
                    onClick={() => router.push('/subscriptions')}
                    className="button-primary px-8 py-3 text-lg font-semibold"
                  >
                    {t('renewPlan')}
                  </button>
                </div>
              ) : (
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <span className="text-dark-400 font-bold text-2xl">?</span>
                  </div>
                  <h3 className="text-2xl font-bold text-dark-300 mb-3">No Subscription</h3>
                  <p className="text-dark-400 mb-6">You don't have an active subscription</p>
                  <button 
                    onClick={() => router.push('/subscriptions')}
                    className="button-primary px-8 py-3 text-lg font-semibold"
                  >
                    Get Subscription
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
}
