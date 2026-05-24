'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, Camera, Share2, RefreshCw, Smartphone, Trash2, Loader2, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ActiveSession {
  deviceId: string;
  lastSeenAt: string;
  deviceLabel: string;
}

interface QRConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'myqr' | 'scan';
}

const DEVICE_SESSION_KEY = 'raha_device_session_id';

function getDeviceLabel(): string {
  if (typeof window === 'undefined') return 'Unknown Device';
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android Device';
  if (/iPhone|iPad/i.test(ua)) return 'iOS Device';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Mac/i.test(ua)) return 'Mac';
  return 'Browser';
}

export default function QRConnectModal({ isOpen, onClose, initialTab = 'myqr' }: QRConnectModalProps) {
  const { user, refreshUserData } = useAuth();
  const [tab, setTab] = useState<'myqr' | 'scan'>(initialTab);

  // My QR tab state
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [qrExpiry, setQrExpiry] = useState<Date | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [removingDevice, setRemovingDevice] = useState<string | null>(null);

  // Scan tab state
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentDeviceId = typeof window !== 'undefined' ? localStorage.getItem(DEVICE_SESSION_KEY) || '' : '';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanStatus('scanning');
    setScanError('');

    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      canvas.width = img.width;
      canvas.height = img.height;
      if (!ctx) throw new Error('Canvas not supported');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      const { default: jsQR } = await import('jsqr');
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        await handleScannedUrl(code.data);
      } else {
        throw new Error('No QR code found in the image. Please try another clearer image.');
      }
    } catch (e: any) {
      setScanError(e.message || 'Failed to scan the image.');
      setScanStatus('error');
    }
  };

  // Generate QR code
  const generateQR = useCallback(async () => {
    if (!user?.uid) return;
    setQrLoading(true);
    try {
      const res = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      if (data.success) {
        setQrImageUrl(data.qrImageUrl);
        setDeepLink(data.deepLink);
        setQrExpiry(new Date(data.expiresAt));
        setTimeLeft(300);
      }
    } catch (e) {
      console.error('QR generate error:', e);
    } finally {
      setQrLoading(false);
    }
  }, [user?.uid]);

  // Load sessions from DB
  const loadSessions = useCallback(async () => {
    if (!user?.uid) return;
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from('rahapremium_users')
      .select('active_sessions')
      .eq('id', user.uid)
      .single();
    if (data?.active_sessions) {
      setActiveSessions(Array.isArray(data.active_sessions) ? data.active_sessions : []);
    }
  }, [user?.uid]);

  // Remove a session
  const removeSession = async (deviceId: string) => {
    if (!user) return;
    setRemovingDevice(deviceId);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const updated = activeSessions.filter(s => s.deviceId !== deviceId);
      await supabase
        .from('rahapremium_users')
        .update({ active_sessions: updated })
        .eq('id', user.uid);
      setActiveSessions(updated);
    } finally {
      setRemovingDevice(null);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!isOpen || tab !== 'myqr') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { generateQR(); return 300; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, tab, generateQR]);

  // On open
  useEffect(() => {
    if (isOpen && tab === 'myqr') {
      generateQR();
      loadSessions();
    }
  }, [isOpen, tab, generateQR, loadSessions]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // Share QR
  const handleShare = async () => {
    if (!deepLink) return;
    if (navigator.share) {
      try { await navigator.share({ title: 'Login to RahaPremium', url: deepLink }); } catch {}
    } else {
      await navigator.clipboard.writeText(deepLink);
      alert('Link copied to clipboard!');
    }
  };

  // Camera scanning
  const startScan = async () => {
    setScanStatus('scanning');
    setScanError('');
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScanError('Camera API is not supported in your browser.');
      setScanStatus('error');
      return;
    }

    const constraints = { video: { facingMode: 'environment' } };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(async (stream) => {
        // Handling successful camera access
        await handleSuccessfulCameraAccess(stream);
      })
      .catch((err) => {
        // Handling errors - try fallback constraint
        const fallbackConstraints = { video: true };
        navigator.mediaDevices.getUserMedia(fallbackConstraints)
          .then(async (fallbackStream) => {
            await handleSuccessfulCameraAccess(fallbackStream);
          })
          .catch((fallbackErr) => {
            handleCameraError(fallbackErr);
          });
      });
  };

  const handleSuccessfulCameraAccess = async (stream: MediaStream) => {
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch (e) {
        console.error('Video play error:', e);
      }
    }

    const { default: jsQR } = await import('jsqr');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) return;
      if (!ctx) return;
      
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      try {
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          await handleScannedUrl(code.data);
        }
      } catch {}
    }, 500);
  };

  const handleCameraError = (e: any) => {
    console.error('Camera error:', e);
    let errorMsg = 'Camera access denied. Please allow camera permissions.';
    if (e.name === 'NotAllowedError') {
      errorMsg = 'Camera access denied. Please enable camera permissions in your browser settings.';
    } else if (e.name === 'NotFoundError') {
      errorMsg = 'No camera found on this device.';
    } else if (e.name === 'NotReadableError') {
      errorMsg = 'Camera is already in use by another application.';
    } else if (e.message) {
      errorMsg = e.message;
    }
    setScanError(errorMsg);
    setScanStatus('error');
  };

  const stopScan = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const handleScannedUrl = async (url: string) => {
    stopScan();
    try {
      const urlObj = new URL(url);
      const token = urlObj.searchParams.get('qr');
      if (!token) throw new Error('Invalid QR code');

      setScanStatus('scanning');

      const deviceId = localStorage.getItem(DEVICE_SESSION_KEY) || crypto.randomUUID();
      localStorage.setItem(DEVICE_SESSION_KEY, deviceId);

      const res = await fetch('/api/qr/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, deviceId, deviceLabel: getDeviceLabel() }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('supabase_uid', data.userId);
        localStorage.setItem('supabase_phone', data.phoneNumber);
        setScanStatus('success');
        setScanSuccess(`Logged in! Redirecting...`);
        setTimeout(() => { window.location.href = '/'; }, 1500);
      } else {
        throw new Error(data.error || 'Failed to connect');
      }
    } catch (e: any) {
      setScanError(e.message || 'Invalid QR code');
      setScanStatus('error');
    }
  };

  useEffect(() => {
    if (!isOpen) stopScan();
    return () => stopScan();
  }, [isOpen]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const getDeviceLimit = () => {
    if (!user?.subscription?.isActive) return 1;
    const limits: Record<string, number> = { FEDHA: 1, CHUMA: 1, DHAHABU: 1, ALMASI: 2, MALKIA: 4 };
    return limits[user.subscription.packageType] ?? 1;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-0 z-[9991] flex items-center justify-center p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: 'rgba(10,10,26,0.98)', border: '1px solid rgba(167,139,250,0.2)', boxShadow: '0 0 60px rgba(167,139,250,0.15)' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                    <QrCode size={16} className="text-white" />
                  </div>
                  <span className="text-white font-bold text-lg">Device Connect</span>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex mx-6 mt-4 mb-0 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                {(['myqr', 'scan'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={tab === t ? { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff' } : { color: 'rgba(255,255,255,0.4)' }}>
                    {t === 'myqr' ? (
                      <span className="flex items-center justify-center gap-2"><Smartphone size={16} /> My QR Code</span>
                    ) : (
                      <span className="flex items-center justify-center gap-2"><Camera size={16} /> Scan QR Code</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="px-6 pb-6 pt-4">
                {/* MY QR TAB */}
                {tab === 'myqr' && (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-white/50 text-xs text-center">Show this to another device to log in instantly</p>

                    {/* QR Image */}
                    <div className="relative w-56 h-56 rounded-2xl overflow-hidden flex items-center justify-center bg-white shadow-[0_0_30px_rgba(79,70,229,0.3)] border border-primary-500/20">
                      {qrLoading ? (
                        <Loader2 size={36} className="text-primary-600 animate-spin" />
                      ) : qrImageUrl ? (
                        <img src={qrImageUrl} alt="QR Code" className="w-full h-full object-contain p-2" />
                      ) : (
                        <QrCode size={48} className="text-primary-600/30" />
                      )}
                    </div>

                    {/* Timer */}
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${timeLeft > 60 ? 'bg-green-400' : 'bg-orange-400'} animate-pulse`} />
                      <span className="text-white/50">Expires in <span className={`font-bold ${timeLeft > 60 ? 'text-green-400' : 'text-orange-400'}`}>{formatTime(timeLeft)}</span></span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 w-full">
                      <button onClick={generateQR} disabled={qrLoading}
                        className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-white/70 hover:text-white transition-all"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <RefreshCw size={14} /> Refresh
                      </button>
                      <button onClick={handleShare}
                        className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-white transition-all"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                        <Share2 size={14} /> Share
                      </button>
                    </div>

                    {/* Device limit info */}
                    <div className="w-full rounded-xl p-3" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/60 text-xs">Active Devices</span>
                        <span className="text-purple-400 text-xs font-bold">{activeSessions.length}/{getDeviceLimit()}</span>
                      </div>
                      <div className="space-y-1.5">
                        {activeSessions.length === 0 && <p className="text-white/30 text-xs text-center py-1">No active sessions</p>}
                        {activeSessions.map(s => (
                          <div key={s.deviceId} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Smartphone size={12} className={s.deviceId === currentDeviceId ? 'text-green-400' : 'text-white/40'} />
                              <span className="text-white/60 text-xs">{s.deviceLabel}</span>
                              {s.deviceId === currentDeviceId && <span className="text-green-400 text-[10px]">(this device)</span>}
                            </div>
                            {s.deviceId !== currentDeviceId && (
                              <button onClick={() => removeSession(s.deviceId)} disabled={!!removingDevice}
                                className="text-red-400/60 hover:text-red-400 transition-colors">
                                {removingDevice === s.deviceId ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SCAN TAB */}
                {tab === 'scan' && (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-white/50 text-xs text-center">Scan another user's QR code to connect their account on this device</p>

                    {scanStatus === 'idle' && (
                      <div className="w-full flex flex-col gap-3">
                        <button onClick={() => fileInputRef.current?.click()}
                          className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-white font-bold text-base transition-all"
                          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                          <Upload size={22} /> Upload QR Image
                        </button>
                        <input 
                          type="file" 
                          accept="image/*" 
                          ref={fileInputRef} 
                          className="hidden" 
                          onChange={handleFileUpload} 
                        />
                      </div>
                    )}

                    {scanStatus === 'scanning' && (
                      <div className="w-full">
                        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black">
                          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                          {/* Scan overlay */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-48 h-48 border-2 border-purple-400 rounded-2xl relative">
                              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-purple-400 rounded-tl-lg" />
                              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-purple-400 rounded-tr-lg" />
                              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-purple-400 rounded-bl-lg" />
                              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-purple-400 rounded-br-lg" />
                              <motion.div
                                animate={{ top: ['0%', '100%', '0%'] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="absolute left-0 right-0 h-0.5 bg-purple-400"
                                style={{ boxShadow: '0 0 8px rgba(167,139,250,0.8)' }}
                              />
                            </div>
                          </div>
                        </div>
                        <button onClick={() => { stopScan(); setScanStatus('idle'); }}
                          className="w-full mt-3 py-3 rounded-xl text-white/60 text-sm transition-all hover:text-white"
                          style={{ background: 'rgba(255,255,255,0.06)' }}>
                          Cancel
                        </button>
                      </div>
                    )}

                    {scanStatus === 'success' && (
                      <div className="flex flex-col items-center gap-3 py-4">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.2)' }}>
                          <CheckCircle size={36} className="text-green-400" />
                        </div>
                        <p className="text-green-400 font-bold text-lg">Connected!</p>
                        <p className="text-white/50 text-sm">{scanSuccess}</p>
                        <Loader2 size={20} className="text-white/30 animate-spin" />
                      </div>
                    )}

                    {scanStatus === 'error' && (
                      <div className="w-full">
                        <div className="flex flex-col items-center gap-3 py-4">
                          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.2)' }}>
                            <AlertCircle size={36} className="text-red-400" />
                          </div>
                          <p className="text-red-400 font-bold">Failed</p>
                          <p className="text-white/50 text-sm text-center">{scanError}</p>
                        </div>
                        <div className="flex flex-col gap-3">
                          <button onClick={() => setScanStatus('idle')}
                            className="w-full py-3 rounded-xl text-white font-semibold text-sm"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                            Try Again
                          </button>
                          <button onClick={() => fileInputRef.current?.click()}
                            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all hover:bg-white/5"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            Upload QR Image Instead
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
