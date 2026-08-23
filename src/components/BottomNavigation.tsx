'use client';

import React, { useState, useEffect } from 'react';
import { Compass, AlertTriangle, Radio, Users, X, MessageCircle, Instagram, Twitter, Facebook, Youtube, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformControls } from '@/contexts/PlatformControlContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getControlCenterSettings, ControlCenterSettings, subscribeToControlCenterSettings } from '@/lib/admin-settings';

export default function BottomNavigation() {
  const { t } = useLanguage();
  const { user, adminUser, loading: authLoading } = useAuth();
  const { toggles, loading: togglesLoading } = usePlatformControls();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [socialSettings, setSocialSettings] = useState<ControlCenterSettings | null>(null);

  useEffect(() => {
    setIsClient(true);
    getControlCenterSettings().then(setSocialSettings).catch(console.error);

    const unsubscribe = subscribeToControlCenterSettings((settings) => {
      setSocialSettings(settings);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isFollowModalOpen && !socialSettings) {
      getControlCenterSettings().then(setSocialSettings).catch(console.error);
    }
  }, [isFollowModalOpen]);

  // Show the +18 icon only when the section is enabled by an admin.
  // When turned off it is hidden for everyone (admins manage adult content
  // from the admin panel, not the public +18 tab).
  const liveTvEnabled = togglesLoading ? true : (toggles.liveTvEnabled ?? true);
  const adultSectionEnabled = togglesLoading ? true : toggles.adultSectionEnabled;
  const shouldShowAdultIcon = !authLoading && isClient && adultSectionEnabled;

  // External Live TV URL from environment variable.
  // When empty, clicking the Live TV button does nothing.
  const liveTvUrl = process.env.NEXT_PUBLIC_LIVE_TV_URL || '';

  const navItems = [
    { icon: Compass, label: t('home'), href: '/' },
    ...(liveTvEnabled
      ? [{ icon: Radio, label: 'Live TV', href: liveTvUrl, isLiveTV: true, isExternal: true }]
      : []),
    ...(shouldShowAdultIcon
      ? [{ icon: AlertTriangle, label: t('adultContentShort'), href: '/adult', requireAuth: false, adultOnly: true, warning: true }]
      : []),
  ];

  const isPaymentModalOpen = typeof document !== 'undefined' && document.body.classList.contains('payment-modal-open');

  if (isPaymentModalOpen) return null;

  const hasSocialLinks = socialSettings && (
    socialSettings.socialWhatsapp ||
    socialSettings.socialInstagram ||
    socialSettings.socialTwitter ||
    socialSettings.socialFacebook ||
    socialSettings.socialTelegram ||
    socialSettings.socialYoutube
  );

  return (
    <>
      <nav
        className="mobile-nav"
        style={{
          background: 'rgba(30, 107, 239, 0.98)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <div className="flex items-stretch">
        {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const shouldRedirectToAuth = item.requireAuth && !user && !adminUser;
            // Use item-level isExternal flag, and also detect http/https hrefs
            const isExternal = item.isExternal || item.href.startsWith('http://') || item.href.startsWith('https://');
            const targetHref = shouldRedirectToAuth ? `/auth?redirect=${encodeURIComponent(item.href)}` : item.href;

            const innerContent = (
              <>
                {/* Active top pill */}
                {isActive && (
                  <span
                    className="absolute top-1.5 left-1/2 -translate-x-1/2 h-1 rounded-full transition-all duration-300"
                    style={{
                      width: '32px',
                      background: '#ffffff',
                      boxShadow: '0 0 10px #ffffff80',
                    }}
                  />
                )}

                {/* Icon */}
                <div className="relative flex items-center justify-center mb-0.5">
                  <Icon
                    size={22}
                    className={`mb-0.5 transition-all duration-200 ${
                      isActive
                        ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                        : 'text-white/60 group-hover:text-white'
                    }`}
                    style={item.isLiveTV && isActive ? { animation: 'pulse 1.5s infinite' } : {}}
                  />
                  {/* Live dot */}
                  {item.isLiveTV && (
                    <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-white rounded-full">
                      <span className="absolute inset-0 rounded-full bg-white animate-ping opacity-75" />
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-xs font-semibold transition-colors duration-200 ${
                    isActive
                      ? 'text-white'
                      : 'text-white/60 group-hover:text-white'
                  }`}
                >
                  {item.label}
                </span>
              </>
            );

            // Live TV with no URL configured: render a passive button that does nothing
            if (item.isLiveTV && !item.href) {
              return (
                <button
                  key="live-tv-noop"
                  type="button"
                  className="flex-1 flex flex-col items-center justify-center py-2.5 px-1 relative group transition-colors duration-200 cursor-default"
                  aria-label="Live TV"
                >
                  {innerContent}
                </button>
              );
            }

            if (isExternal) {
              return (
                <a
                  key={item.href}
                  href={targetHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex flex-col items-center justify-center py-2.5 px-1 relative group transition-colors duration-200"
                >
                  {innerContent}
                </a>
              );
            }

            return (
              <Link
                key={item.href}
                href={targetHref}
                className="flex-1 flex flex-col items-center justify-center py-2.5 px-1 relative group transition-colors duration-200"
              >
                {innerContent}
              </Link>
            );
          })}


          {/* Follow Us Button */}
          <button
            onClick={() => setIsFollowModalOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-2.5 px-1 relative group transition-colors duration-200"
            aria-label="Follow Us"
          >
            <div className="relative flex items-center justify-center mb-0.5">
              <Users
                size={22}
                className="mb-0.5 transition-all duration-200 text-white/60 group-hover:text-white"
              />
              {/* Notification pulse dot */}
              <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-yellow-400 rounded-full">
                <span className="absolute inset-0 rounded-full bg-yellow-400 animate-ping opacity-75" />
              </span>
            </div>
            <span className="text-xs font-semibold text-white/60 group-hover:text-white transition-colors duration-200">
              Msaada
            </span>
          </button>
        </div>
      </nav>

      {/* Follow Us Modal */}
      <AnimatePresence>
        {isFollowModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsFollowModalOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
              style={{
                background: 'rgba(15, 23, 42, 0.97)',
                backdropFilter: 'blur(24px)',
                borderTop: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #1e6bef, #1e40af)' }}
                  >
                    <Users size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base leading-tight">Msaada</h3>
                    <p className="text-white/50 text-xs">Stay connected on social media</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFollowModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="Close"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>

              {/* Social Links */}
              <div className="px-4 py-4 space-y-2 max-h-[60vh] overflow-y-auto pb-8">
                {!socialSettings ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !hasSocialLinks ? (
                  <div className="text-center py-8 text-white/40 text-sm">
                    No social links configured yet.
                  </div>
                ) : (
                  <>
                    {socialSettings.socialWhatsapp && (
                      <a
                        href={socialSettings.socialWhatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                        onClick={() => setIsFollowModalOpen(false)}
                      >
                        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                          <MessageCircle size={20} className="text-green-400" />
                        </div>
                        <div>
                          <span className="text-white font-semibold text-sm block">WhatsApp</span>
                          <span className="text-white/40 text-xs">Join our group</span>
                        </div>
                      </a>
                    )}
                    {socialSettings.socialInstagram && (
                      <a
                        href={socialSettings.socialInstagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                        onClick={() => setIsFollowModalOpen(false)}
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center group-hover:bg-primary-500/30 transition-colors">
                          <Instagram size={20} className="text-primary-400" />
                        </div>
                        <div>
                          <span className="text-white font-semibold text-sm block">Instagram</span>
                          <span className="text-white/40 text-xs">Follow our page</span>
                        </div>
                      </a>
                    )}
                    {socialSettings.socialTwitter && (
                      <a
                        href={socialSettings.socialTwitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                        onClick={() => setIsFollowModalOpen(false)}
                      >
                        <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center group-hover:bg-sky-500/30 transition-colors">
                          <Twitter size={20} className="text-sky-400" />
                        </div>
                        <div>
                          <span className="text-white font-semibold text-sm block">Twitter / X</span>
                          <span className="text-white/40 text-xs">Follow for updates</span>
                        </div>
                      </a>
                    )}
                    {socialSettings.socialFacebook && (
                      <a
                        href={socialSettings.socialFacebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                        onClick={() => setIsFollowModalOpen(false)}
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
                          <Facebook size={20} className="text-blue-400" />
                        </div>
                        <div>
                          <span className="text-white font-semibold text-sm block">Facebook</span>
                          <span className="text-white/40 text-xs">Like our page</span>
                        </div>
                      </a>
                    )}
                    {socialSettings.socialTelegram && (
                      <a
                        href={socialSettings.socialTelegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                        onClick={() => setIsFollowModalOpen(false)}
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-400/20 flex items-center justify-center group-hover:bg-blue-400/30 transition-colors">
                          <Send size={20} className="text-blue-300" />
                        </div>
                        <div>
                          <span className="text-white font-semibold text-sm block">Telegram</span>
                          <span className="text-white/40 text-xs">Join our channel</span>
                        </div>
                      </a>
                    )}
                    {socialSettings.socialYoutube && (
                      <a
                        href={socialSettings.socialYoutube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                        onClick={() => setIsFollowModalOpen(false)}
                      >
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                          <Youtube size={20} className="text-red-400" />
                        </div>
                        <div>
                          <span className="text-white font-semibold text-sm block">YouTube</span>
                          <span className="text-white/40 text-xs">Subscribe to our channel</span>
                        </div>
                      </a>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
