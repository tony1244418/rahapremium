'use client';

import React from 'react';
import { X, Compass, Clapperboard, MonitorPlay, BookOpen, CreditCard, Settings, Shield, AlertTriangle, Gamepad2, Radio, MessageCircle, Instagram, Twitter, Facebook, Youtube, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { getControlCenterSettings, ControlCenterSettings } from '@/lib/admin-settings';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SideMenu({ isOpen, onClose }: SideMenuProps) {
  const { t } = useLanguage();
  const { user, adminUser, loading: authLoading } = useAuth();
  const [socialSettings, setSocialSettings] = React.useState<ControlCenterSettings | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      getControlCenterSettings().then(setSocialSettings).catch(console.error);
    }
  }, [isOpen]);

  // Determine if adult content icon should be visible
  // Only show when auth has finished loading AND user has verified age (to prevent flicker)
  const shouldShowAdultIcon = !authLoading && user && user.isAdult;

  const menuItems = [
    { icon: Compass, label: t('home'), href: '/' },
    { icon: Clapperboard, label: t('movies'), href: '/movies' },
    { icon: MonitorPlay, label: t('series'), href: '/series' },
    { icon: Gamepad2, label: t('games'), href: '/games' },
    { icon: Radio, label: 'Live TV', href: '/live-tv', isLiveTV: true },
    ...(shouldShowAdultIcon ? [{ icon: AlertTriangle, label: t('adultContent'), href: '/adult', adultOnly: true, warning: true }] : []),
    { icon: CreditCard, label: t('subscriptions'), href: '/subscriptions' },
    { icon: Shield, label: t('admin'), href: '/admin', adminOnly: true },
    { icon: Settings, label: t('settings'), href: '/settings' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Side Menu */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] glass-effect border-r border-dark-700/50"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-dark-700/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 relative">
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
                    <div className="w-10 h-10 bg-primary-gradient rounded-lg flex items-center justify-center hidden">
                      <span className="text-white font-bold text-lg">R</span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg flex items-center tracking-tight">
                      <span className="font-black text-white">Raha</span>
                      <span className="font-black text-blue-500">Premium</span>
                    </h2>
                    <p className="text-sm text-dark-400">Premium Entertainment</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="touch-button text-dark-400 hover:text-dark-100 transition-colors duration-200 focus-ring rounded-lg"
                  aria-label={t('close')}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 py-6">
                <nav className="space-y-2 px-4">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    
                    // Skip admin items if not admin
                    if (item.adminOnly && !adminUser) {
                      return null;
                    }

                    // Adult content items are already filtered out in menuItems array, so no need to check here

                    // For protected routes, redirect to auth if not logged in
                    const isProtectedRoute = ['/movies', '/series', '/games', '/subscriptions', '/settings'].includes(item.href);
                    const shouldRedirectToAuth = isProtectedRoute && !user && !adminUser;

                    return (
                      <Link
                        key={item.href}
                        href={shouldRedirectToAuth ? `/auth?redirect=${encodeURIComponent(item.href)}` : item.href}
                        onClick={onClose}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                          item.warning 
                            ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20' 
                            : item.isLiveTV
                            ? 'text-red-500 hover:text-red-400 hover:bg-red-500/10'
                            : 'text-dark-200 hover:text-primary-400 hover:bg-dark-800/50'
                        }`}
                      >
                        <div className="relative">
                        <Icon 
                          size={20} 
                          className={`transition-colors duration-200 ${
                            item.warning 
                              ? 'group-hover:text-red-300' 
                                : item.isLiveTV
                                ? 'text-red-500 group-hover:text-red-400 animate-pulse'
                              : 'group-hover:text-primary-400'
                          }`}
                        />
                          {item.isLiveTV && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                          )}
                        </div>
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                {socialSettings && (socialSettings.socialWhatsapp || socialSettings.socialInstagram || socialSettings.socialTwitter || socialSettings.socialFacebook || socialSettings.socialTelegram || socialSettings.socialYoutube || socialSettings.socialTiktok) && (
                  <div className="mt-4 border-t border-dark-700/50 pt-4 px-4">
                    <h3 className="text-xs font-semibold text-dark-400 mb-2 uppercase tracking-wider px-4">Msaada</h3>
                    <nav className="space-y-2">
                      {socialSettings.socialWhatsapp && (
                        <a href={socialSettings.socialWhatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-dark-200 hover:text-green-500 hover:bg-dark-800/50 group">
                          <MessageCircle size={20} className="transition-colors duration-200 group-hover:text-green-500" />
                          <span className="font-medium">WhatsApp</span>
                        </a>
                      )}
                      {socialSettings.socialInstagram && (
                        <a href={socialSettings.socialInstagram} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-dark-200 hover:text-primary-500 hover:bg-dark-800/50 group">
                          <Instagram size={20} className="transition-colors duration-200 group-hover:text-primary-500" />
                          <span className="font-medium">Instagram</span>
                        </a>
                      )}
                      {socialSettings.socialTwitter && (
                        <a href={socialSettings.socialTwitter} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-dark-200 hover:text-blue-400 hover:bg-dark-800/50 group">
                          <Twitter size={20} className="transition-colors duration-200 group-hover:text-blue-400" />
                          <span className="font-medium">Twitter</span>
                        </a>
                      )}
                      {socialSettings.socialFacebook && (
                        <a href={socialSettings.socialFacebook} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-dark-200 hover:text-blue-600 hover:bg-dark-800/50 group">
                          <Facebook size={20} className="transition-colors duration-200 group-hover:text-blue-600" />
                          <span className="font-medium">Facebook</span>
                        </a>
                      )}
                      {socialSettings.socialTelegram && (
                        <a href={socialSettings.socialTelegram} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-dark-200 hover:text-blue-400 hover:bg-dark-800/50 group">
                          <Send size={20} className="transition-colors duration-200 group-hover:text-blue-400" />
                          <span className="font-medium">Telegram</span>
                        </a>
                      )}
                      {socialSettings.socialYoutube && (
                        <a href={socialSettings.socialYoutube} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-dark-200 hover:text-red-600 hover:bg-dark-800/50 group">
                          <Youtube size={20} className="transition-colors duration-200 group-hover:text-red-600" />
                          <span className="font-medium">YouTube</span>
                        </a>
                      )}
                    </nav>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-dark-700/50">
                <div className="text-center text-sm text-dark-400">
                  <p>&copy; {new Date().getFullYear()} RahaPremium</p>
                  <p>Premium Entertainment Platform</p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
