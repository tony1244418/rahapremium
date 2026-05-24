'use client';

import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, XCircle, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function TestPWAPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<any>({});
  const [pwaCriteria, setPwaCriteria] = useState<any>({});

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkInstalled();

    // Check service worker registration
    if ('serviceWorker' in navigator) {
      // Try to register service worker if not already registered
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          setSwRegistered(true);
        } else {
          // Try to register it
          navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then((reg) => {
              console.log('Service Worker registered:', reg);
              setSwRegistered(true);
            })
            .catch((err) => {
              console.error('Service Worker registration failed:', err);
              setSwRegistered(false);
            });
        }
      }).catch((err) => {
        console.error('Error checking service worker:', err);
        setSwRegistered(false);
      });
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

    // Get browser info (only on client side)
    if (typeof window !== 'undefined') {
      setBrowserInfo({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
        isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
        isChrome: /Chrome/.test(navigator.userAgent),
        isFirefox: /Firefox/.test(navigator.userAgent),
        isEdge: /Edg/.test(navigator.userAgent),
      });
    }

    // Check PWA criteria (only on client side)
    if (typeof window !== 'undefined') {
      setPwaCriteria({
        hasManifest: !!document.querySelector('link[rel="manifest"]'),
        hasServiceWorker: 'serviceWorker' in navigator,
        isHTTPS: location.protocol === 'https:' || location.hostname === 'localhost',
        hasIcons: !!document.querySelector('link[rel="icon"]'),
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log('Install outcome:', outcome);
    setDeferredPrompt(null);
  };

  const getInstallInstructions = () => {
    if (browserInfo.isIOS && browserInfo.isSafari) {
      return {
        title: "iOS Safari Instructions",
        steps: [
          "Tap the Share button (⎋) at the bottom of Safari",
          "Scroll down and tap 'Add to Home Screen'",
          "Tap 'Add' to confirm"
        ]
      };
    } else if (browserInfo.isChrome) {
      return {
        title: "Chrome Instructions",
        steps: [
          "Look for the install button in the address bar",
          "Or click the three dots menu → 'Install RahaPremium'",
          "Or use the install button below"
        ]
      };
    } else if (browserInfo.isFirefox) {
      return {
        title: "Firefox Instructions",
        steps: [
          "Look for the install button in the address bar",
          "Or go to Menu → 'Install'"
        ]
      };
    } else if (browserInfo.isEdge) {
      return {
        title: "Edge Instructions",
        steps: [
          "Look for the install button in the address bar",
          "Or click the three dots menu → 'Apps' → 'Install this site as an app'"
        ]
      };
    } else {
      return {
        title: "General Instructions",
        steps: [
          "Look for an install button in your browser's address bar",
          "Or check the browser menu for 'Install' or 'Add to Home Screen' options"
        ]
      };
    }
  };

  const instructions = getInstallInstructions();

  return (
    <div className="min-h-screen bg-main-gradient p-4">
      <div className="max-w-4xl mx-auto">
        <div className="glass-effect rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gradient mb-4">PWA Installation Test</h1>
          <p className="text-dark-400 mb-6">
            This page helps you test and troubleshoot PWA installation for RahaPremium.
          </p>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="glass-effect rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {isInstalled ? (
                  <CheckCircle className="text-green-400" size={20} />
                ) : (
                  <XCircle className="text-red-400" size={20} />
                )}
                <span className="font-semibold text-dark-100">App Installed</span>
              </div>
              <p className="text-xs text-dark-400">
                {isInstalled ? 'Yes' : 'No'}
              </p>
            </div>

            <div className="glass-effect rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {swRegistered ? (
                  <CheckCircle className="text-green-400" size={20} />
                ) : (
                  <XCircle className="text-red-400" size={20} />
                )}
                <span className="font-semibold text-dark-100">Service Worker</span>
              </div>
              <p className="text-xs text-dark-400">
                {swRegistered ? 'Registered' : 'Not Registered'}
              </p>
            </div>

            <div className="glass-effect rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {pwaCriteria.hasManifest ? (
                  <CheckCircle className="text-green-400" size={20} />
                ) : (
                  <XCircle className="text-red-400" size={20} />
                )}
                <span className="font-semibold text-dark-100">Manifest</span>
              </div>
              <p className="text-xs text-dark-400">
                {pwaCriteria.hasManifest ? 'Found' : 'Missing'}
              </p>
            </div>

            <div className="glass-effect rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {pwaCriteria.isHTTPS ? (
                  <CheckCircle className="text-green-400" size={20} />
                ) : (
                  <XCircle className="text-red-400" size={20} />
                )}
                <span className="font-semibold text-dark-100">HTTPS</span>
              </div>
              <p className="text-xs text-dark-400">
                {pwaCriteria.isHTTPS ? 'Secure' : 'Not Secure'}
              </p>
            </div>
          </div>

          {/* Install Button */}
          {deferredPrompt && !isInstalled && (
            <div className="glass-effect rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-dark-100 mb-2">Install Available</h3>
              <p className="text-dark-400 mb-4">
                Your browser supports PWA installation. Click the button below to install RahaPremium.
              </p>
              <button
                onClick={handleInstallClick}
                className="bg-primary-gradient text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
              >
                <Download size={20} />
                <span>Install RahaPremium</span>
              </button>
            </div>
          )}

          {/* Installation Instructions */}
          <div className="glass-effect rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-dark-100 mb-4 flex items-center space-x-2">
              {browserInfo.isIOS ? <Smartphone size={20} /> : <Monitor size={20} />}
              <span>{instructions.title}</span>
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-dark-400">
              {instructions.steps.map((step, index) => (
                <li key={index} className="text-sm">{step}</li>
              ))}
            </ol>
          </div>

          {/* Browser Information */}
          <div className="glass-effect rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-dark-100 mb-4">Browser Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-dark-200">Platform:</span>
                <span className="ml-2 text-dark-400">{browserInfo.platform}</span>
              </div>
              <div>
                <span className="font-medium text-dark-200">Browser:</span>
                <span className="ml-2 text-dark-400">
                  {browserInfo.isChrome ? 'Chrome' : 
                   browserInfo.isSafari ? 'Safari' : 
                   browserInfo.isFirefox ? 'Firefox' : 
                   browserInfo.isEdge ? 'Edge' : 'Other'}
                </span>
              </div>
              <div>
                <span className="font-medium text-dark-200">iOS Device:</span>
                <span className="ml-2 text-dark-400">{browserInfo.isIOS ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="font-medium text-dark-200">Protocol:</span>
                <span className="ml-2 text-dark-400">
                  {typeof window !== 'undefined' ? String(location.protocol) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* PWA Criteria */}
          <div className="glass-effect rounded-lg p-4">
            <h3 className="text-lg font-semibold text-dark-100 mb-4">PWA Requirements Check</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-dark-200">Web App Manifest:</span>
                <span className={pwaCriteria.hasManifest ? 'text-green-400' : 'text-red-400'}>
                  {pwaCriteria.hasManifest ? '✓' : '✗'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dark-200">Service Worker:</span>
                <span className={pwaCriteria.hasServiceWorker ? 'text-green-400' : 'text-red-400'}>
                  {pwaCriteria.hasServiceWorker ? '✓' : '✗'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dark-200">HTTPS/Localhost:</span>
                <span className={pwaCriteria.isHTTPS ? 'text-green-400' : 'text-red-400'}>
                  {pwaCriteria.isHTTPS ? '✓' : '✗'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-dark-200">Icons:</span>
                <span className={pwaCriteria.hasIcons ? 'text-green-400' : 'text-red-400'}>
                  {pwaCriteria.hasIcons ? '✓' : '✗'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
