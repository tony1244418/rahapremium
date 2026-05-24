'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MonitorSmartphone, LogOut, ShieldAlert } from 'lucide-react';

// ─── Event names ──────────────────────────────────────────────────────────────
export const DEVICE_CONFLICT_EVENT = 'device-conflict-detected';
export const DEVICE_KICKED_EVENT = 'device-kicked-out';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DeviceConflictDetail {
  onContinueHere: () => void;
  onLogout: () => void;
}

export default function DeviceConflictModal() {
  // "Another device is using your account — continue here?" modal
  const [conflictVisible, setConflictVisible] = useState(false);
  const [conflictHandlers, setConflictHandlers] = useState<DeviceConflictDetail | null>(null);

  // "You were logged out because someone else logged in" modal
  const [kickedVisible, setKickedVisible] = useState(false);

  useEffect(() => {
    const handleConflict = (e: Event) => {
      const detail = (e as CustomEvent<DeviceConflictDetail>).detail;
      setConflictHandlers(detail);
      setConflictVisible(true);
    };

    const handleKicked = () => {
      if (typeof document !== 'undefined') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(err => console.error('Error exiting full screen:', err));
        }
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          if (!video.paused) {
            video.pause();
          }
        });
      }
      setKickedVisible(true);
    };

    window.addEventListener(DEVICE_CONFLICT_EVENT, handleConflict);
    window.addEventListener(DEVICE_KICKED_EVENT, handleKicked);

    return () => {
      window.removeEventListener(DEVICE_CONFLICT_EVENT, handleConflict);
      window.removeEventListener(DEVICE_KICKED_EVENT, handleKicked);
    };
  }, []);

  const handleContinueHere = () => {
    setConflictVisible(false);
    conflictHandlers?.onContinueHere();
  };

  const handleGoBack = () => {
    setConflictVisible(false);
    conflictHandlers?.onLogout();
  };

  const handleKickedDismiss = () => {
    setKickedVisible(false);
    // Redirect to auth page
    window.location.href = '/auth';
  };

  return (
    <>
      {/* ── Conflict modal: "account used elsewhere, continue here?" ── */}
      <AnimatePresence>
        {conflictVisible && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
            >
              <div
                className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center text-center gap-4"
                style={{
                  background: 'rgba(15, 23, 42, 0.97)',
                  border: '1px solid rgba(255,165,0,0.3)',
                  boxShadow: '0 0 40px rgba(255,165,0,0.15)',
                }}
              >
                {/* Icon */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                >
                  <MonitorSmartphone size={32} className="text-white" />
                </div>

                <div>
                  <h2 className="text-white font-bold text-lg leading-snug mb-1">
                    Akaunti Inatumika Kwingine
                  </h2>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Akaunti yako inatumika kwenye kifaa kingine kwa sasa hivi.
                    Je, unataka kuendelea kutumia kwenye kifaa hiki?
                  </p>
                </div>

                <div className="w-full flex flex-col gap-3 mt-1">
                  <button
                    onClick={handleContinueHere}
                    className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-all duration-200 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #1e6bef, #7c3aed)' }}
                  >
                    ✅ Ndiyo, Endelea Hapa
                  </button>
                  <button
                    onClick={handleGoBack}
                    className="w-full py-3.5 rounded-2xl font-semibold text-white/60 text-sm border border-white/10 hover:bg-white/5 transition-all duration-200 active:scale-95"
                  >
                    Rudi Nyuma
                  </button>
                </div>

                <p className="text-white/30 text-xs">
                  Ukichagua &quot;Endelea&quot;, kifaa kingine kitatoka nje moja kwa moja.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Kicked modal: "you were logged out from another device" ── */}
      <AnimatePresence>
        {kickedVisible && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
            >
              <div
                className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center text-center gap-4"
                style={{
                  background: 'rgba(15, 23, 42, 0.97)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  boxShadow: '0 0 40px rgba(239,68,68,0.15)',
                }}
              >
                {/* Icon */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                >
                  <ShieldAlert size={32} className="text-white" />
                </div>

                <div>
                  <h2 className="text-white font-bold text-lg leading-snug mb-1">
                    Umetoka Nje
                  </h2>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Akaunti yako imetumika kwenye kifaa kingine na umetolewa moja kwa moja.
                    Kama wewe mwenyewe hukufanya hivi, badilisha nambari yako ya simu.
                  </p>
                </div>

                <button
                  onClick={handleKickedDismiss}
                  className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                >
                  <LogOut size={18} />
                  Ingia Tena
                </button>

                <p className="text-white/30 text-xs">
                  Akaunti moja inaruhusiwa kwenye kifaa kimoja tu.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
