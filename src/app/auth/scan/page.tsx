'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';

function QrScanContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [scannerReady, setScannerReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedSession, setScannedSession] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'confirm' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [willSignOutAfterApprove, setWillSignOutAfterApprove] = useState(false);
  
  const html5QrcodeRef = useRef<any>(null);
  const isScanningRef = useRef(false); // Sync ref to track actual scanner running state
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Dual view states (Camera/Upload)
  const [activeView, setActiveView] = useState<'home' | 'camera' | 'upload'>('home');
  const [dragActive, setDragActive] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // Safe client-side query param extraction
  useEffect(() => {
    if (searchParams) {
      const session = searchParams.get('session');
      if (session) {
        setScannedSession(session);
      }
    }
  }, [searchParams]);

  // Media Devices Polyfill to ensure getUserMedia works on legacy/unsupported platforms
  const polyfillMediaDevices = () => {
    if (typeof window === 'undefined') return;
    try {
      if (navigator.mediaDevices === undefined) {
        try {
          Object.defineProperty(navigator, 'mediaDevices', {
            value: {},
            writable: true,
            configurable: true
          });
        } catch (err) {
          console.warn('Unable to define navigator.mediaDevices property:', err);
          return;
        }
      }
      if (navigator.mediaDevices.getUserMedia === undefined) {
        navigator.mediaDevices.getUserMedia = function (constraints) {
          const legacyGetUserMedia =
            (navigator as any).getUserMedia ||
            (navigator as any).webkitGetUserMedia ||
            (navigator as any).mozGetUserMedia ||
            (navigator as any).msGetUserMedia;
          if (!legacyGetUserMedia) {
            return Promise.reject(
              new Error('getUserMedia is not supported in this browser.')
            );
          }
          return new Promise(function (resolve, reject) {
            legacyGetUserMedia.call(navigator, constraints, resolve, reject);
          });
        };
      }
      if (navigator.mediaDevices.enumerateDevices === undefined) {
        navigator.mediaDevices.enumerateDevices = function () {
          return Promise.resolve([]);
        };
      }
    } catch (e) {
      console.warn('Could not polyfill navigator.mediaDevices safely:', e);
    }
  };

  // Secure Context & API Availability Check
  const checkCameraSupport = () => {
    if (typeof window === 'undefined') return { supported: false, reason: 'ssr', message: '' };

    const isSecure =
      window.isSecureContext === true ||
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]';

    if (!isSecure) {
      return {
        supported: false,
        reason: 'insecure',
        message:
          'Camera requires a secure connection (HTTPS).\n\n' +
          'You are currently on HTTP which blocks camera access on all modern browsers.\n\n' +
          'Please access via a secure HTTPS tunnel (e.g. using ngrok or Vercel secure URL).\n\n' +
          'You can still scan QR codes using the Upload option below.'
      };
    }

    polyfillMediaDevices();

    if (
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      return {
        supported: false,
        reason: 'unsupported',
        message:
          'Camera API is not available in this browser.\n\n' +
          'Please try:\n' +
          '• Updating your browser to the latest version\n' +
          '• Using Chrome, Firefox, Safari, or Brave\n\n' +
          'You can still scan QR codes using the Upload option below.'
      };
    }

    return { supported: true };
  };

  // Pre-flight camera request to verify permissions & hardware availability
  const testCameraAccess = async (mode: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode }
      });
      stream.getTracks().forEach((t) => { t.stop(); });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err };
    }
  };

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  const lastFetchedSessionRef = useRef<string | null>(null);

  // Load session data if we have a sessionId
  useEffect(() => {
    if (!scannedSession || !user) return;
    if (lastFetchedSessionRef.current === scannedSession) return;

    const fetchSession = async () => {
      lastFetchedSessionRef.current = scannedSession;
      setStatus('loading');
      try {
        const { data, error } = await supabase
          .from('qr_login_sessions')
          .select('*')
          .eq('id', scannedSession)
          .single();

        if (error) {
          // Surface the real Supabase error so it's debuggable
          const code = error.code || '';
          const msg = error.message || '';
          if (code === '42P01' || msg.includes('does not exist')) {
            throw new Error(
              'Setup required: The qr_login_sessions table has not been created in your Supabase database.\n\n' +
              'Please run the setup SQL in your Supabase dashboard.'
            );
          }
          if (code === '42501' || msg.toLowerCase().includes('policy') || msg.toLowerCase().includes('rls') || msg.toLowerCase().includes('permission')) {
            throw new Error(
              'Database permission error (RLS).\n\n' +
              'Please disable RLS on the qr_login_sessions table in Supabase, or add a policy that allows reading by session ID.\n\n' +
              `Detail: ${msg}`
            );
          }
          if (code === 'PGRST116') {
            throw new Error('QR code not found. It may have expired or been used already.\n\nPlease generate a new QR code.');
          }
          throw new Error(`Session lookup failed (${code}): ${msg}`);
        }

        if (!data) {
          throw new Error('QR code not found. Please generate a new one.');
        }

        if (data.status !== 'pending') {
          throw new Error('This QR code has already been used.\n\nPlease scan a fresh QR code.');
        }

        if (new Date() > new Date(data.expires_at)) {
          throw new Error('This QR code has expired (5-minute limit).\n\nPlease generate a new QR code on your PC.');
        }

        setSessionData(data);
        setStatus('confirm');

      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'Failed to read QR code.');
      }
    };

    fetchSession();
  }, [scannedSession, user]);

  const handleApprove = async () => {
    if (!scannedSession || !user) return;
    setStatus('loading');

    try {
      const { error } = await supabase
        .from('qr_login_sessions')
        .update({
          status: 'approved',
          user_id: user.uid,
          phone_number: user.phoneNumber,
        })
        .eq('id', scannedSession);

      if (error) throw error;

      // Determine device limit from the admin-configured packages, considering
      // both the general and Live TV subscriptions.
      const { getUserDeviceLimit } = await import('@/lib/subscriptions');
      const deviceLimit = await getUserDeviceLimit(user);

      const needsSignOut = deviceLimit <= 1;
      setWillSignOutAfterApprove(needsSignOut);
      setStatus('success');

      if (needsSignOut) {
        // Basic plan (1-device limit): sign out the scanning device after approval
        // so the newly linked device can claim the single available session slot.
        setTimeout(async () => {
          try { await signOut(); } catch (_) {}
          router.push('/auth');
        }, 2500);
      } else {
        // Pro plan (multi-device): both devices stay active — just go back to profile
        setTimeout(() => {
          router.push('/profile');
        }, 2000);
      }

    } catch (err: any) {
      setStatus('error');
      setErrorMsg('Failed to approve login. Please try again.');
    }
  };

  const startScanner = async () => {
    await startScannerWithMode(facingMode);
  };

  const startScannerWithMode = async (modeToUse: 'environment' | 'user') => {
    if (!(window as any).Html5Qrcode) return;

    // 1. Check support & secure context
    const support = checkCameraSupport();
    if (!support.supported) {
      setStatus('error');
      setErrorMsg(support.message || 'Camera access is not supported on this browser.');
      return;
    }

    setIsScanning(true);
    isScanningRef.current = true;
    setScannedSession(null);
    setStatus('idle');

    let mode = modeToUse;

    // 2. Pre-flight check actual camera access
    const testResult = await testCameraAccess(mode);
    if (!testResult.ok) {
      const err = testResult.error;
      const errName = err && (err as any).name ? (err as any).name : '';
      const errMsg = err ? String((err as any).message || err) : '';
      console.error('Camera pre-flight failed:', errName, errMsg);

      if (errName === 'OverconstrainedError' && mode === 'environment') {
        // Retry with user facing camera
        mode = 'user';
        setFacingMode('user');
        const retryResult = await testCameraAccess(mode);
        if (!retryResult.ok) {
          setIsScanning(false);
          isScanningRef.current = false;
          setStatus('error');
          setErrorMsg('Camera constraints are not supported by your device.');
          return;
        }
      } else if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setIsScanning(false);
        isScanningRef.current = false;
        setStatus('error');
        setErrorMsg(
          'Camera permission was denied.\n\n' +
          'Please allow camera access:\n' +
          '• Tap the lock/info icon in your address bar\n' +
          '• Enable Camera permission\n' +
          '• Reload the page\n\n' +
          'Or use the Upload option instead.'
        );
        return;
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setIsScanning(false);
        isScanningRef.current = false;
        setStatus('error');
        setErrorMsg('No camera detected on this device.\n\nUse the Upload option to scan QR codes from saved images.');
        return;
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setIsScanning(false);
        isScanningRef.current = false;
        setStatus('error');
        setErrorMsg('Camera is being used by another app.\n\nClose other apps using the camera and try again.');
        return;
      } else if (errName === 'TypeError') {
        setIsScanning(false);
        isScanningRef.current = false;
        setStatus('error');
        setErrorMsg(
          'Camera access is blocked.\n\n' +
          'This usually happens on HTTP connections. Please make sure you are using a secure connection (HTTPS).\n\n' +
          'You can still use the Upload option.'
        );
        return;
      } else {
        setIsScanning(false);
        isScanningRef.current = false;
        setStatus('error');
        setErrorMsg('Could not start camera.\n\n' + errMsg + '\n\nTry the Upload option instead.');
        return;
      }
    }

    // 3. Launch html5-qrcode
    try {
      if (html5QrcodeRef.current) {
        if (isScanningRef.current) {
          try {
            await html5QrcodeRef.current.stop();
          } catch (_) {}
          isScanningRef.current = false;
        }
        html5QrcodeRef.current = null;
      }

      html5QrcodeRef.current = new (window as any).Html5Qrcode('qr-reader', { verbose: false });

      const config = {
        fps: 12,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.7;
          return { width: Math.floor(size), height: Math.floor(size) };
        },
        aspectRatio: 1.0,
        disableFlip: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      await html5QrcodeRef.current.start(
        { facingMode: mode },
        config,
        async (decodedText: string) => {
          // Play micro-vibration on mobile if supported
          if (navigator.vibrate) {
            try { navigator.vibrate(100); } catch (_) {}
          }
          
          // Stop camera immediately to shut down the physical light indicator
          if (html5QrcodeRef.current && isScanningRef.current) {
            try {
              await html5QrcodeRef.current.stop();
            } catch (_) {}
            isScanningRef.current = false;
            setIsScanning(false);
          }

          processDecodedText(decodedText);
        },
        () => {
          // Frame callback - silent
        }
      );
    } catch (err: any) {
      console.error('html5Qrcode launch error:', err);
      isScanningRef.current = false;
      setIsScanning(false);
      setStatus('error');
      setErrorMsg('Scanner failed to start.\n\n' + String(err) + '\n\nPlease try the Upload option.');
    }
  };

  const switchCamera = async () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    
    if (html5QrcodeRef.current && isScanningRef.current) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (_) {}
      isScanningRef.current = false;
      setIsScanning(false);
    }

    // Brief timeout to let the hardware device release lock cleanly before starting again
    setTimeout(() => {
      startScannerWithMode(newMode);
    }, 200);
  };

  const stopScanner = async () => {
    if (html5QrcodeRef.current && isScanningRef.current) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (_) {}
      isScanningRef.current = false;
      setIsScanning(false);
    }
  };

  // Only run stop cleanup on component unmount to release media device locks
  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current && isScanningRef.current) {
        html5QrcodeRef.current.stop().catch(() => {});
        isScanningRef.current = false;
      }
    };
  }, []);

  // Safe processing function
  const processDecodedText = (decodedText: string) => {
    let sessionId = '';
    const cleanText = decodedText.trim();
    
    // Check if direct UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanText)) {
      sessionId = cleanText;
    } else {
      // Check if URL and extract parameter
      try {
        const url = new URL(cleanText);
        sessionId = url.searchParams.get('session') || '';
      } catch (e) {
        // Retry parsing by adding a prefix protocol
        try {
          const url = new URL('http://' + cleanText);
          sessionId = url.searchParams.get('session') || '';
        } catch (_) {}
      }
    }

    if (sessionId) {
      setScannedSession(sessionId);
    } else {
      setStatus('error');
      setErrorMsg('Invalid QR code.\n\nPlease scan a Raha Premium login code.');
    }
  };

  // Handle uploaded file decoding
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus('error');
      setErrorMsg('Please select a valid image file (PNG, JPG, etc.).');
      return;
    }

    setUploadFile(file);
    const previewUrl = URL.createObjectURL(file);
    setUploadPreview(previewUrl);
    setStatus('loading');

    try {
      if (!(window as any).Html5Qrcode) {
        throw new Error('Scanner library is loading. Please wait a second.');
      }

      // Create an isolated temporary element to prevent camera-state overlap
      const tempId = 'fileScannerTemp_' + Date.now();
      const fileScannerEl = document.createElement('div');
      fileScannerEl.id = tempId;
      fileScannerEl.style.display = 'none';
      document.body.appendChild(fileScannerEl);

      const fileScanner = new (window as any).Html5Qrcode(tempId, { verbose: false });
      const decodedText = await fileScanner.scanFile(file, false);
      
      URL.revokeObjectURL(previewUrl);
      fileScannerEl.remove();

      processDecodedText(decodedText);

    } catch (err: any) {
      console.error('File scan error:', err);
      setStatus('error');
      setErrorMsg(
        'No QR code was found in this image.\n\n' +
        'Tips:\n' +
        '• Make sure the QR code is clearly visible\n' +
        '• Crop the image to focus on the QR code\n' +
        '• Ensure good lighting and no blur'
      );
      
      // Clean up temp element if it exists in DOM
      const oldTemp = document.querySelector('[id^="fileScannerTemp_"]');
      if (oldTemp) oldTemp.remove();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#06060f] flex items-center justify-center scan-page-body">
        <div className="spinner"></div>
      </div>
    );
  }

  // Handle non-logged in state gracefully with manual action card
  if (!user) {
    return (
      <div className="min-h-screen bg-[#06060f] relative overflow-hidden flex flex-col items-center justify-center p-4 scan-page-body">
        
        {/* Ambient background orbs */}
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
        <div className="bg-orb orb-3"></div>

        <div className="app-container w-full">
          <div className="glass-card result-card py-10">
            <div className="result-error-icon bg-blue-500/10 text-blue-400 flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
            </div>
            
            <span className="result-badge">SECURE PORTAL</span>
            
            <h2 className="result-heading text-white text-xl font-bold mt-2">Authentication Required</h2>
            
            <p className="error-msg text-[#8892a4] my-4 text-sm max-w-sm mx-auto leading-relaxed">
              You must be logged in to your Raha Premium account on this device to approve linked device connections.
            </p>
            
            <div className="error-actions w-full max-w-xs mx-auto">
              <Link href="/auth" className="action-btn primary w-full text-center justify-center font-bold">
                Log In Now
              </Link>
            </div>
          </div>
        </div>

        {/* Styled Inline Styles overrides */}
        <style dangerouslySetInnerHTML={{__html: `
          @import url('https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@300;400;500;600;700&display=swap');

          :root {
            --bg-deep: #06060f;
            --bg-mid: #0e0e1a;
            --glass-bg: rgba(255, 255, 255, 0.04);
            --glass-border: rgba(255, 255, 255, 0.08);
            --glass-hover: rgba(255, 255, 255, 0.07);
            --accent: #00d4ff;
            --accent2: #7c3aed;
            --gradient: linear-gradient(135deg, #00d4ff, #7c3aed);
            --success: #10b981;
            --error: #ef4444;
            --text: #f1f5f9;
            --text-secondary: #8892a4;
            --text-muted: #5a6278;
            --radius-lg: 24px;
            --radius-md: 16px;
            --radius-sm: 12px;
            --transition: .3s cubic-bezier(.4,0,.2,1);
          }

          /* ── Ambient background orbs ── */
          .bg-orb {
            position: fixed;
            border-radius: 50%;
            pointer-events: none;
            filter: blur(100px);
            opacity: .18;
            z-index: 0;
          }
          .orb-1 {
            width: 340px; height: 340px;
            background: var(--accent);
            top: -80px; left: -60px;
            animation: float1 22s ease-in-out infinite;
          }
          .orb-2 {
            width: 280px; height: 280px;
            background: var(--accent2);
            bottom: 10%; right: -40px;
            animation: float2 26s ease-in-out infinite;
          }
          .orb-3 {
            width: 200px; height: 200px;
            background: #ec4899;
            top: 50%; left: 30%;
            animation: float3 20s ease-in-out infinite;
          }

          @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(40px,60px)} }
          @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-50px,-40px)} }
          @keyframes float3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-50px)} }

          .scan-page-body {
            font-family: 'Lexend Deca', sans-serif !important;
            color: var(--text);
            -webkit-font-smoothing: antialiased;
          }

          .app-container {
            position: relative;
            z-index: 1;
            max-width: 460px;
            margin: 0 auto;
            padding: 20px 16px 40px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          .glass-card {
            background: var(--glass-bg);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-lg);
            padding: 6px;
            box-shadow: 0 8px 40px rgba(0,0,0,.35);
            width: 100%;
          }

          .result-card {
            padding: 32px 20px;
            text-align: center;
            width: 100%;
          }

          .result-error-icon {
            width: 64px; height: 64px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 50%;
            margin: 0 auto 16px;
            animation: popIn .4s ease;
          }
          .result-error-icon { background: rgba(0,212,255,.1); }

          @keyframes popIn {
            0%   { transform: scale(0); opacity:0; }
            70%  { transform: scale(1.15); }
            100% { transform: scale(1); opacity:1; }
          }

          .result-badge {
            display: inline-block;
            padding: 3px 14px;
            font-size: .68rem;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
            border-radius: 100px;
            background: rgba(0,212,255,.12);
            color: var(--accent);
            margin-bottom: 10px;
          }

          .result-heading {
            font-size: 1.05rem;
            font-weight: 600;
            margin-bottom: 14px;
          }

          .error-msg {
            font-size: .85rem;
            color: var(--text-secondary);
            font-weight: 300;
            line-height: 1.6;
            margin-bottom: 24px;
            text-align: center;
            padding: 0 4px;
          }

          .action-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 11px 22px;
            font-family: inherit;
            font-size: .84rem;
            font-weight: 500;
            border: none;
            border-radius: 100px;
            cursor: pointer;
            transition: transform var(--transition), box-shadow var(--transition);
          }
          .action-btn:active { transform: scale(.96); }

          .action-btn.primary {
            background: var(--gradient);
            color: #fff;
          }
          .action-btn.primary:hover {
            box-shadow: 0 4px 20px rgba(0,212,255,.3);
            transform: translateY(-1px);
          }
        `}} />

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06060f] relative overflow-hidden flex flex-col items-center justify-center p-4 scan-page-body">
      
      {/* Script Loader */}
      <Script 
        src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js" 
        onLoad={() => setScannerReady(true)}
      />

      {/* Ambient background orbs */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <div className="app-container w-full">
        
        {/* ===== HOME VIEW HEADER ===== */}
        {activeView === 'home' && status === 'idle' && (
          <header className="app-header">
            <div className="logo flex justify-center mb-3">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="2" y="2" width="14" height="14" rx="3" stroke="url(#g1)" strokeWidth="2.5" fill="none"/>
                <rect x="24" y="2" width="14" height="14" rx="3" stroke="url(#g1)" strokeWidth="2.5" fill="none"/>
                <rect x="2" y="24" width="14" height="14" rx="3" stroke="url(#g1)" strokeWidth="2.5" fill="none"/>
                <rect x="6" y="6" width="6" height="6" rx="1.5" fill="url(#g1)"/>
                <rect x="28" y="6" width="6" height="6" rx="1.5" fill="url(#g1)"/>
                <rect x="6" y="28" width="6" height="6" rx="1.5" fill="url(#g1)"/>
                <rect x="26" y="26" width="4" height="4" rx="1" fill="url(#g1)"/>
                <rect x="32" y="26" width="6" height="4" rx="1" fill="url(#g1)"/>
                <rect x="26" y="32" width="4" height="6" rx="1" fill="url(#g1)"/>
                <rect x="34" y="34" width="4" height="4" rx="1" fill="url(#g1)"/>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="40" y2="40">
                    <stop stopColor="#00d4ff"/>
                    <stop offset="1" stopColor="#7c3aed"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="text-[1.75rem] font-bold text-center bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] bg-clip-text text-transparent">
              Linked Devices
            </h1>
            <p className="subtitle">Scan &amp; approve logins instantly</p>
          </header>
        )}

        {/* ===== 1. HOME OPTIONS VIEW ===== */}
        {activeView === 'home' && status === 'idle' && (
          <main className="view w-full">
            <div className="glass-card options-card">
              
              {/* Scan with Camera Button */}
              <button 
                onClick={() => {
                  setActiveView('camera');
                  startScanner();
                }}
                disabled={!scannerReady}
                className="option-btn" 
                type="button"
              >
                <div className="option-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                <div className="option-text">
                  <span className="option-title">Scan with Camera</span>
                  <span className="option-desc">Point your camera at any QR code</span>
                </div>
                <svg className="option-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>

              <div className="divider"></div>

              {/* Upload Image Button */}
              <button 
                onClick={() => setActiveView('upload')}
                className="option-btn" 
                type="button"
              >
                <div className="option-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div className="option-text">
                  <span className="option-title">Upload Image</span>
                  <span className="option-desc">Pick a QR code image from your gallery</span>
                </div>
                <svg className="option-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>

            <div className="features-row">
              <div className="feature-chip">Instant</div>
              <div className="feature-chip">Private</div>
              <div className="feature-chip">Any Device</div>
            </div>

            <div className="mt-8 text-center">
              <Link href="/profile" className="text-sm font-light text-[#8892a4] hover:text-white transition-colors inline-flex items-center gap-1.5 justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back to Profile
              </Link>
            </div>
          </main>
        )}

        {/* ===== 2. CAMERA SCANNER VIEW ===== */}
        {activeView === 'camera' && isScanning && (
          <section className="view w-full">
            <div className="scanner-wrapper">
              
              <div className="scanner-top-bar">
                <button 
                  onClick={() => {
                    stopScanner();
                    setActiveView('home');
                  }}
                  className="icon-btn" 
                  type="button" 
                  aria-label="Go back"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </button>
                
                <span className="scanner-title">Scanning…</span>
                
                <button 
                  onClick={switchCamera}
                  className="icon-btn" 
                  type="button" 
                  aria-label="Switch camera"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 16v4h-4"/><path d="M14 20l6-6"/>
                    <path d="M4 8V4h4"/><path d="M10 4L4 10"/>
                  </svg>
                </button>
              </div>

              <div className="scanner-frame">
                <div id="qr-reader" />
                <div className="scan-overlay">
                  <div className="corner tl"></div>
                  <div className="corner tr"></div>
                  <div className="corner bl"></div>
                  <div className="corner br"></div>
                  <div className="scan-line"></div>
                </div>
              </div>
              <p className="scan-hint">Position QR code within the frame</p>
            </div>
          </section>
        )}

        {/* ===== 3. FILE UPLOAD VIEW ===== */}
        {activeView === 'upload' && status === 'idle' && (
          <section className="view w-full">
            <div className="glass-card upload-card">
              
              <div className="card-top-bar">
                <button 
                  onClick={() => {
                    setActiveView('home');
                    setUploadFile(null);
                    setUploadPreview(null);
                  }}
                  className="icon-btn" 
                  type="button" 
                  aria-label="Go back"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </button>
                <span className="card-title text-white">Upload QR Image</span>
                <div className="w-[42px] h-[42px]"></div> {/* Spacer */}
              </div>

              <div 
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => document.getElementById('fileInput')?.click()}
                className={`drop-zone ${dragActive ? 'dragover' : ''}`}
              >
                <div className="drop-visual flex justify-center mb-2">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="drop-svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <p className="drop-text text-center text-slate-300">Drag &amp; drop image here</p>
                <p className="drop-or text-center text-slate-500 my-1">or</p>
                
                <span className="choose-file-btn">Browse Files</span>
                
                <input 
                  type="file" 
                  id="fileInput" 
                  accept="image/*" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  hidden 
                />
              </div>
            </div>
          </section>
        )}

        {/* ===== 4. LOADING VIEW ===== */}
        {status === 'loading' && (
          <section className="view w-full">
            <div className="glass-card result-card flex flex-col items-center justify-center py-12">
              <div className="spinner mb-4"></div>
              <span className="text-[#8892a4] text-sm font-medium">
                {uploadPreview ? 'Analyzing image…' : 'Verifying login session…'}
              </span>
            </div>
          </section>
        )}

        {/* ===== 5. CONFIRM / APPROVE VIEW ===== */}
        {status === 'confirm' && sessionData && (
          <section className="view w-full">
            <div className="glass-card result-card">
              <div className="result-success-icon bg-blue-500/10 text-blue-400 flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                  <line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
              </div>
              
              <span className="result-badge">RAHA PREMIUM</span>
              
              <h2 className="result-heading text-white text-xl font-bold mt-2">Approve Login?</h2>
              
              <div className="result-content text-left bg-black/35 rounded-xl border border-white/5 p-4 mb-5 text-sm text-[#8892a4] space-y-2">
                <p className="text-slate-300">A new device is requesting access to your Raha Premium account.</p>
                <div className="divider opacity-30 my-2"></div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Session ID</p>
                  <p className="font-mono text-xs text-slate-200 select-all break-all">{scannedSession}</p>
                </div>
              </div>

              <div className="result-actions flex gap-3">
                <button 
                  onClick={() => {
                    setStatus('idle');
                    setScannedSession(null);
                    setUploadFile(null);
                    setUploadPreview(null);
                    setActiveView('home');
                  }}
                  className="action-btn secondary flex-1 text-center justify-center font-medium"
                  type="button"
                >
                  Cancel
                </button>
                
                <button 
                  onClick={handleApprove}
                  className="action-btn primary flex-1 text-center justify-center font-bold"
                  type="button"
                >
                  Approve
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ===== 6. SUCCESS VIEW ===== */}
        {status === 'success' && (
          <section className="view w-full">
            <div className="glass-card result-card py-10">
              <div className="result-success-icon bg-emerald-500/10 text-emerald-400 flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              
              <span className="result-badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SUCCESS</span>
              
              <h2 className="result-heading text-white text-xl font-bold mt-2">Device Linked Successfully!</h2>
              
              <p className="text-[#8892a4] text-sm mb-2">
                The new device is now logged into your account.
              </p>

              {willSignOutAfterApprove ? (
                <>
                  <div className="mt-3 mb-1 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                    <strong>Basic Plan:</strong> Your account only allows 1 active device at a time. This phone will be signed out so the new device can log in.
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Signing out this device…</p>
                </>
              ) : (
                <>
                  <div className="mt-3 mb-1 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed">
                    <strong>Pro Plan:</strong> Both devices are now active on your account.
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Redirecting back to your profile…</p>
                </>
              )}
            </div>
          </section>
        )}

        {/* ===== 7. ERROR VIEW ===== */}
        {status === 'error' && (
          <section className="view w-full">
            <div className="glass-card error-card">
              <div className="result-error-icon bg-rose-500/10 text-rose-400 flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              
              <h2 className="error-heading text-white text-lg font-bold">Scan Failed</h2>
              
              <p className="error-msg text-[#8892a4] whitespace-pre-line my-4 text-sm">
                {errorMsg}
              </p>
              
              <div className="error-actions w-full flex flex-col gap-2">
                {activeView === 'camera' && (
                  <button 
                    onClick={() => {
                      setStatus('idle');
                      setScannedSession(null);
                      setUploadFile(null);
                      setUploadPreview(null);
                      setActiveView('upload');
                    }}
                    className="action-btn primary w-full text-center justify-center font-medium"
                    type="button"
                  >
                    Upload Instead
                  </button>
                )}
                
                <button 
                  onClick={() => {
                    setStatus('idle');
                    setScannedSession(null);
                    setUploadFile(null);
                    setUploadPreview(null);
                    setActiveView('home');
                  }}
                  className="scan-again-btn w-full"
                  type="button"
                >
                  Try Again
                </button>
              </div>
            </div>
          </section>
        )}

      </div>

      {/* Styled Inline Styles overrides */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@300;400;500;600;700&display=swap');

        :root {
          --bg-deep: #06060f;
          --bg-mid: #0e0e1a;
          --glass-bg: rgba(255, 255, 255, 0.04);
          --glass-border: rgba(255, 255, 255, 0.08);
          --glass-hover: rgba(255, 255, 255, 0.07);
          --accent: #00d4ff;
          --accent2: #7c3aed;
          --gradient: linear-gradient(135deg, #00d4ff, #7c3aed);
          --success: #10b981;
          --error: #ef4444;
          --text: #f1f5f9;
          --text-secondary: #8892a4;
          --text-muted: #5a6278;
          --radius-lg: 24px;
          --radius-md: 16px;
          --radius-sm: 12px;
          --transition: .3s cubic-bezier(.4,0,.2,1);
        }

        /* ── Ambient background orbs ── */
        .bg-orb {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(100px);
          opacity: .18;
          z-index: 0;
        }
        .orb-1 {
          width: 340px; height: 340px;
          background: var(--accent);
          top: -80px; left: -60px;
          animation: float1 22s ease-in-out infinite;
        }
        .orb-2 {
          width: 280px; height: 280px;
          background: var(--accent2);
          bottom: 10%; right: -40px;
          animation: float2 26s ease-in-out infinite;
        }
        .orb-3 {
          width: 200px; height: 200px;
          background: #ec4899;
          top: 50%; left: 30%;
          animation: float3 20s ease-in-out infinite;
        }

        @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(40px,60px)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-50px,-40px)} }
        @keyframes float3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-50px)} }

        /* ── App Container override ── */
        .scan-page-body {
          font-family: 'Lexend Deca', sans-serif !important;
          color: var(--text);
          -webkit-font-smoothing: antialiased;
        }

        .app-container {
          position: relative;
          z-index: 1;
          max-width: 460px;
          margin: 0 auto;
          padding: 20px 16px 40px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        /* ── Header ── */
        .app-header {
          text-align: center;
          padding: 24px 0 8px;
          animation: fadeDown .6s ease;
          width: 100%;
        }
        .subtitle {
          font-size: .85rem;
          color: var(--text-secondary);
          font-weight: 300;
          margin-top: 4px;
          letter-spacing: .3px;
        }

        /* ── Views ── */
        .view {
          width: 100%;
          animation: fadeUp .4s ease;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Glass card ── */
        .glass-card {
          background: var(--glass-bg);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          padding: 6px;
          box-shadow: 0 8px 40px rgba(0,0,0,.35);
          width: 100%;
        }

        /* ── Options card (Home) ── */
        .options-card { margin-top: 16px; }

        .option-btn {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          padding: 18px 16px;
          background: transparent;
          border: none;
          border-radius: 20px;
          color: var(--text);
          cursor: pointer;
          transition: background var(--transition);
          text-align: left;
          font-family: inherit;
        }
        .option-btn:hover, .option-btn:focus-visible {
          background: var(--glass-hover);
        }
        .option-btn:active { transform: scale(.98); }

        .option-icon {
          width: 52px; height: 52px;
          display: flex; align-items: center; justify-content: center;
          border-radius: var(--radius-sm);
          background: rgba(0,212,255,.08);
          color: var(--accent);
          flex-shrink: 0;
        }

        .option-text { flex: 1; }
        .option-title {
          display: block;
          font-size: .95rem;
          font-weight: 500;
        }
        .option-desc {
          display: block;
          font-size: .78rem;
          color: var(--text-secondary);
          font-weight: 300;
          margin-top: 2px;
        }
        .option-arrow { color: var(--text-muted); flex-shrink: 0; }

        .divider {
          height: 1px;
          background: var(--glass-border);
          margin: 0 16px;
        }

        /* ── Feature chips ── */
        .features-row {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 24px;
          animation: fadeUp .7s ease;
        }
        .feature-chip {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 14px;
          font-size: .72rem;
          font-weight: 400;
          color: var(--text-secondary);
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 100px;
          letter-spacing: .3px;
        }

        /* ── Scanner view ── */
        .scanner-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }
        .scanner-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          margin-bottom: 12px;
        }
        .scanner-title {
          font-size: .9rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .icon-btn {
          width: 42px; height: 42px;
          display: flex; align-items: center; justify-content: center;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 50%;
          color: var(--text);
          cursor: pointer;
          transition: background var(--transition);
          font-family: inherit;
        }
        .icon-btn:hover { background: var(--glass-hover); }

        .scanner-frame {
          position: relative;
          width: 100%;
          max-width: 360px;
          aspect-ratio: 1;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: #111;
          border: 1px solid var(--glass-border);
        }

        /* html5-qrcode reader styling */
        #qr-reader {
          width: 100% !important;
          height: 100% !important;
          border: none !important;
        }
        #qr-reader video {
          object-fit: cover !important;
          border-radius: var(--radius-lg) !important;
          width: 100% !important;
          height: 100% !important;
        }
        /* Hide library's default UI elements */
        #qr-reader img[alt="Info icon"],
        #qr-reader__dashboard_section,
        #qr-reader__dashboard_section_csr,
        #qr-reader__dashboard_section_fsr,
        #qr-reader__status_span,
        #qr-reader__header_message,
        #qr-reader__scan_region > img,
        #qr-reader div[style*="position: absolute"][style*="border-width"] {
          display: none !important;
        }
        #qr-reader__scan_region {
          position: relative !important;
          max-width: 100% !important;
          max-height: 100% !important;
          width: 100% !important;
          height: 100% !important;
        }

        /* Scan overlay corners + line */
        .scan-overlay {
          position: absolute;
          top: 50%; left: 50%;
          width: 220px; height: 220px;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 5;
        }
        .corner {
          position: absolute;
          width: 32px; height: 32px;
          border-color: var(--accent);
          border-style: solid;
          border-width: 0;
        }
        .corner.tl { top:0;left:0;  border-top-width:3px;border-left-width:3px;  border-top-left-radius:12px; }
        .corner.tr { top:0;right:0; border-top-width:3px;border-right-width:3px; border-top-right-radius:12px; }
        .corner.bl { bottom:0;left:0;  border-bottom-width:3px;border-left-width:3px;  border-bottom-left-radius:12px; }
        .corner.br { bottom:0;right:0; border-bottom-width:3px;border-right-width:3px; border-bottom-right-radius:12px; }

        .scan-line {
          position: absolute;
          left: 8px; right: 8px;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, var(--accent) 30%, var(--accent) 70%, transparent 100%);
          box-shadow: 0 0 12px var(--accent);
          animation: scanMove 2.2s ease-in-out infinite;
          border-radius: 2px;
        }
        @keyframes scanMove {
          0%,100% { top: 8px; opacity:.6; }
          50%     { top: calc(100% - 10px); opacity:1; }
        }

        .scan-hint {
          margin-top: 16px;
          font-size: .82rem;
          color: var(--text-secondary);
          font-weight: 300;
          text-align: center;
        }

        /* ── Upload view ── */
        .upload-card { padding: 16px; width: 100%; }

        .card-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .card-title {
          font-size: .95rem;
          font-weight: 500;
        }

        .drop-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          border: 2px dashed rgba(255,255,255,.1);
          border-radius: var(--radius-md);
          transition: border-color var(--transition), background var(--transition);
          cursor: pointer;
          min-height: 220px;
          width: 100%;
        }
        .drop-zone.dragover {
          border-color: var(--accent);
          background: rgba(0,212,255,.04);
        }
        .drop-svg { color: var(--text-muted); margin-bottom: 8px; }
        .drop-text { font-size: .9rem; color: var(--text-secondary); font-weight: 400; }
        .drop-or { font-size: .75rem; color: var(--text-muted); margin: 10px 0; }

        .choose-file-btn {
          display: inline-block;
          padding: 10px 28px;
          background: var(--gradient);
          color: #fff;
          font-family: inherit;
          font-size: .85rem;
          font-weight: 500;
          border-radius: 100px;
          cursor: pointer;
          transition: transform var(--transition), box-shadow var(--transition);
        }
        .choose-file-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(0,212,255,.25);
        }

        .upload-preview {
          text-align: center;
          padding: 20px;
        }
        .upload-preview img {
          max-width: 100%;
          max-height: 240px;
          border-radius: var(--radius-md);
          margin-bottom: 16px;
          border: 1px solid var(--glass-border);
        }
        .scanning-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: .85rem;
          color: var(--text-secondary);
        }

        .spinner {
          width: 20px; height: 20px;
          border: 2.5px solid rgba(255,255,255,.1);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin .7s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Result view ── */
        .result-card, .error-card {
          padding: 32px 20px;
          text-align: center;
          width: 100%;
        }
        .result-success-icon, .result-error-icon {
          width: 64px; height: 64px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%;
          margin: 0 auto 16px;
          animation: popIn .4s ease;
        }
        .result-success-icon { background: rgba(16,185,129,.1); }
        .result-error-icon { background: rgba(239,68,68,.1); }

        @keyframes popIn {
          0%   { transform: scale(0); opacity:0; }
          70%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity:1; }
        }

        .result-badge {
          display: inline-block;
          padding: 3px 14px;
          font-size: .68rem;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          border-radius: 100px;
          background: rgba(0,212,255,.12);
          color: var(--accent);
          margin-bottom: 10px;
        }

        .result-heading {
          font-size: 1.05rem;
          font-weight: 600;
          margin-bottom: 14px;
        }

        .result-content {
          background: rgba(0,0,0,.25);
          border: 1px solid rgba(255,255,255,.06);
          border-radius: var(--radius-sm);
          padding: 14px 16px;
          font-size: .85rem;
          color: var(--text-secondary);
          word-break: break-all;
          max-height: 160px;
          overflow-y: auto;
          margin-bottom: 20px;
          line-height: 1.5;
          text-align: left;
        }

        .result-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 11px 22px;
          font-family: inherit;
          font-size: .84rem;
          font-weight: 500;
          border: none;
          border-radius: 100px;
          cursor: pointer;
          transition: transform var(--transition), box-shadow var(--transition);
        }
        .action-btn:active { transform: scale(.96); }

        .action-btn.primary {
          background: var(--gradient);
          color: #fff;
        }
        .action-btn.primary:hover {
          box-shadow: 0 4px 20px rgba(0,212,255,.3);
          transform: translateY(-1px);
        }
        .action-btn.secondary {
          background: rgba(255,255,255,.07);
          color: var(--text);
          border: 1px solid var(--glass-border);
        }
        .action-btn.secondary:hover {
          background: rgba(255,255,255,.11);
        }

        .scan-again-btn {
          display: inline-block;
          padding: 10px 32px;
          background: transparent;
          border: 1px solid var(--glass-border);
          border-radius: 100px;
          color: var(--text-secondary);
          font-family: inherit;
          font-size: .84rem;
          font-weight: 400;
          cursor: pointer;
          transition: all var(--transition);
        }
        .scan-again-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
        }

        /* ── Error view ── */
        .error-heading {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .error-msg {
          font-size: .85rem;
          color: var(--text-secondary);
          font-weight: 300;
          line-height: 1.6;
          margin-bottom: 24px;
          text-align: center;
          padding: 0 4px;
        }
        .error-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        @media (min-width: 600px) {
          .app-container { padding: 40px 24px 60px; }
          .app-header { padding-top: 36px; }
          .scanner-frame { max-width: 400px; }
        }

        @media (max-width: 380px) {
          .option-btn { padding: 14px 12px; gap: 10px; }
          .option-icon { width: 44px; height: 44px; }
          .scan-overlay { width: 180px; height: 180px; }
        }
      `}} />

      {/* Hidden container for temporary upload file decoding */}
      <div id="file-qr-reader" style={{ display: 'none' }} />

    </div>
  );
}

export default function QrScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#06060f] flex items-center justify-center scan-page-body">
        <div className="spinner"></div>
      </div>
    }>
      <QrScanContent />
    </Suspense>
  );
}
