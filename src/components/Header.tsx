'use client';

import React, { useState, useEffect } from 'react';
import { Menu, User, Download, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SideMenu from './SideMenu';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function Header() {
  const { t } = useLanguage();
  const { user, adminUser } = useAuth();
  const pathname = usePathname();
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.trim()) {
      window.history.replaceState({}, '', `/?q=${encodeURIComponent(val)}`);
      // We can also dispatch an event if needed, but in next 13 useSearchParams will react to push.
      // However replaceState doesn't always trigger useSearchParams. So let's use router.replace.
    } else {
      window.history.replaceState({}, '', `/`);
    }
    // We need to trigger a popstate or use Next.js router
  };

  return (
    <>
      <header className="header-mobile">
        <div className="container-mobile">
          {isSearchOpen ? (
            <div className="flex items-center h-16 w-full space-x-2 animate-in fade-in slide-in-from-right-4 duration-200">
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  // Optionally clear the search from URL
                  if (pathname === '/') {
                    window.location.href = '/';
                  } else {
                    window.location.href = pathname; // Go back to where they were
                  }
                }}
                className="p-2 touch-button text-dark-100 hover:text-primary-400"
                aria-label="Close search"
              >
                <Menu size={24} className="hidden" /> {/* Just to keep spacing similar if needed, or replace with X */}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              
              <div className="flex-1 bg-dark-800/50 rounded-xl flex items-center px-3 py-2 border border-white/5">
                <Search size={18} className="text-white/40 mr-2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={t('searchPlaceholder') || 'Search movies, series...'}
                  className="w-full bg-transparent border-none text-white focus:ring-0 p-0 text-sm placeholder:text-white/30"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.trim()) {
                      // Using window.location to redirect to home with search param if not on home
                      if (pathname !== '/') {
                        window.location.href = `/?q=${encodeURIComponent(val.trim())}`;
                      } else {
                        // Use history API to update URL without full reload, but page.tsx must listen
                        const url = new URL(window.location.href);
                        url.searchParams.set('q', val.trim());
                        window.history.pushState({}, '', url);
                        // Dispatch event so page.tsx can listen to it
                        window.dispatchEvent(new CustomEvent('app-search', { detail: val.trim() }));
                      }
                    } else {
                      if (pathname === '/') {
                        const url = new URL(window.location.href);
                        url.searchParams.delete('q');
                        window.history.pushState({}, '', url);
                        window.dispatchEvent(new CustomEvent('app-search', { detail: '' }));
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsSearchOpen(false);
                      if (pathname === '/') window.dispatchEvent(new CustomEvent('app-search', { detail: '' }));
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between h-16 animate-in fade-in duration-200">
              {/* Hamburger Menu */}
              <button
                onClick={() => setIsSideMenuOpen(true)}
                className="touch-button text-dark-100 hover:text-primary-400 transition-colors duration-200 focus-ring rounded-lg"
                aria-label={t('open')}
              >
                <Menu size={24} />
              </button>

              {/* Logo */}
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 relative">
                  <Image
                    src="/logo.png"
                    alt="RahaPremium"
                    width={32}
                    height={32}
                    className="w-8 h-8 object-contain"
                    priority
                    unoptimized
                    onError={(e) => {
                      // Fallback if logo fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="w-8 h-8 bg-primary-gradient rounded-lg flex items-center justify-center text-white font-bold text-lg hidden">
                    R
                  </div>
                </div>
                <span className="text-xl font-bold tracking-tight hidden sm:block">
                  <span className="text-white">Raha</span>
                  <span className="text-blue-500">Premium</span>
                </span>
              </Link>

              {/* Right Side Actions */}
              <div className="flex items-center space-x-2">
                {/* Search Icon */}
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="touch-button text-dark-100 hover:text-primary-400 transition-colors duration-200 focus-ring rounded-lg p-1"
                  aria-label={t('search')}
                >
                  <Search size={20} />
                </button>



                {/* Install Button (if available) */}
                {deferredPrompt && !isInstalled && (
                  <button
                    onClick={handleInstallClick}
                    className="touch-button bg-primary-gradient text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:shadow-lg transition-all duration-200 focus-ring"
                    aria-label="Install App"
                  >
                    <Download size={16} className="inline mr-1" />
                    Install
                  </button>
                )}

                {/* Profile Icon/Photo */}
                <Link
                  href={user || adminUser ? "/profile" : pathname !== '/' ? `/auth?redirect=${encodeURIComponent(pathname)}` : "/auth"}
                  className="touch-button hover:scale-105 transition-all duration-200 focus-ring rounded-lg"
                  aria-label={user || adminUser ? t('profile') : t('login')}
                >
                  {user?.profilePhotoURL ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary-400">
                      <Image
                        src={user.profilePhotoURL}
                        alt={user.displayName || 'Profile'}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-primary-gradient rounded-full flex items-center justify-center">
                      {user ? (
                        <span className="text-white text-sm font-semibold">
                          {user.displayName.charAt(0).toUpperCase()}
                        </span>
                      ) : adminUser ? (
                        <span className="text-white text-sm font-semibold">
                          {adminUser.displayName.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <User size={20} className="text-white" />
                      )}
                    </div>
                  )}
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Side Menu */}
      <SideMenu 
        isOpen={isSideMenuOpen} 
        onClose={() => setIsSideMenuOpen(false)} 
      />
    </>
  );
}
