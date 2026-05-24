'use client';

import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', {
          scope: '/',
        })
        .then((registration) => {
          console.log('✅ Service Worker registered successfully:', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New service worker available');
                }
              });
            }
          });
        })
        .catch((registrationError) => {
          console.error('❌ Service Worker registration failed:', registrationError);
        });
    } else {
      console.warn('⚠️ Service Workers are not supported in this browser');
    }

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
      
      // Show install prompt after a shorter delay
      setTimeout(() => {
        if (!localStorage.getItem('pwa-install-dismissed')) {
          setShowInstallPrompt(true);
        }
      }, 3000); // Show after 3 seconds
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS Safari - show manual install instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    if (isIOS && isSafari && !localStorage.getItem('pwa-install-dismissed')) {
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Check if we should show iOS instructions
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  const showIOSInstructions = isIOS && isSafari && !deferredPrompt;

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Show iOS instructions even without deferredPrompt
  if (!showInstallPrompt && !showIOSInstructions) {
    return null;
  }

  return (
    <AnimatePresence>
      {showInstallPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
        >
          <div className="glass-effect rounded-lg p-4 border border-primary-500/50 shadow-xl">
            <div className="flex items-start space-x-3">
              <div className="w-12 h-12 bg-primary-gradient rounded-lg flex items-center justify-center flex-shrink-0">
                <Download size={24} className="text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-dark-100 mb-1">
                  Install RahaPremium
                </h3>
                
                {showIOSInstructions ? (
                  <div className="text-xs text-dark-400 mb-3">
                    <p className="mb-2">To install this app on your iPhone:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Tap the Share button <span className="font-semibold">⎋</span> at the bottom</li>
                      <li>Scroll down and tap <span className="font-semibold">"Add to Home Screen"</span></li>
                      <li>Tap <span className="font-semibold">"Add"</span> to confirm</li>
                    </ol>
                  </div>
                ) : (
                  <p className="text-xs text-dark-400 mb-3">
                    Add to your home screen for quick access and offline viewing
                  </p>
                )}
                
                <div className="flex space-x-2">
                  {!showIOSInstructions && (
                    <button
                      onClick={handleInstallClick}
                      className="bg-primary-gradient text-white text-xs font-medium px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
                    >
                      Install
                    </button>
                  )}
                  <button
                    onClick={handleDismiss}
                    className="text-dark-400 hover:text-dark-200 text-xs font-medium px-3 py-2 rounded-lg transition-colors duration-200"
                  >
                    {showIOSInstructions ? 'Got it' : 'Not now'}
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleDismiss}
                className="text-dark-400 hover:text-dark-200 transition-colors duration-200 flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
