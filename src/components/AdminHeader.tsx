'use client';

import React from 'react';
import { Menu, Shield, LogOut, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';

interface AdminHeaderProps {
  onMenuClick: () => void;
}

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { t } = useLanguage();
  const { adminUser, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="header-mobile bg-dark-900/80 backdrop-blur-sm border-b border-dark-700/50 sticky top-0 z-40">
      <div className="container-mobile">
        <div className="flex items-center justify-between h-16">
          {/* Hamburger Menu */}
          <button
            onClick={onMenuClick}
            className="touch-button text-dark-100 hover:text-primary-400 transition-colors duration-200 focus-ring rounded-lg md:hidden"
            aria-label={t('open')}
          >
            <Menu size={24} />
          </button>

          {/* Logo */}
          <Link href="/admin" className="flex items-center space-x-2">
            <div className="w-8 h-8 relative">
              <div className="w-8 h-8 bg-red-gradient rounded-lg flex items-center justify-center">
                <Shield size={20} className="text-white" />
              </div>
            </div>
            <span className="text-xl font-bold text-gradient hidden sm:block">
              Admin Panel
            </span>
          </Link>

          {/* Admin Profile & Actions */}
          <div className="flex items-center space-x-3">
            {/* Admin Info */}
            <div className="hidden sm:flex items-center space-x-2 text-sm text-dark-300">
              <span>Welcome,</span>
              <span className="font-medium text-dark-100">
                {adminUser?.displayName || 'Administrator'}
              </span>
            </div>

            {/* Profile Icon/Photo */}
            <div className="flex items-center space-x-2">
              {adminUser?.profilePhotoURL ? (
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-red-400">
                  <Image
                    src={adminUser.profilePhotoURL}
                    alt={adminUser.displayName || 'Admin Profile'}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 bg-red-gradient rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {adminUser?.displayName?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
              )}

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="touch-button text-dark-400 hover:text-red-400 transition-colors duration-200 focus-ring rounded-lg p-1"
                aria-label="Sign Out"
                title="Sign Out"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
