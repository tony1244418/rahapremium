'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Clock, MessageCircle, ShieldAlert } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformControls } from '@/contexts/PlatformControlContext';
import {
  ControlCenterSettings,
  DEFAULT_CONTROL_CENTER_SETTINGS,
  subscribeToControlCenterSettings
} from '@/lib/admin-settings';

interface MaintenanceGateProps {
  children: React.ReactNode;
}

export default function MaintenanceGate({ children }: MaintenanceGateProps) {
  const { adminUser } = useAuth();
  const { toggles, loading } = usePlatformControls();
  const pathname = usePathname();
  const [controlSettings, setControlSettings] = useState<ControlCenterSettings>(DEFAULT_CONTROL_CENTER_SETTINGS);
  const [loadingSupport, setLoadingSupport] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToControlCenterSettings((settings) => {
      setControlSettings(settings);
      setLoadingSupport(false);
    });
    return () => unsubscribe();
  }, []);

  const normalizedWhatsappHref = useMemo(() => {
    const digitsOnly = controlSettings.supportWhatsapp.replace(/\D+/g, '');
    if (!digitsOnly) {
      return 'https://wa.me/255700000000';
    }
    const formatted = digitsOnly.startsWith('0') ? `255${digitsOnly.slice(1)}` : digitsOnly;
    return `https://wa.me/${formatted}`;
  }, [controlSettings.supportWhatsapp]);

  const isMaintenanceActive = !loading && toggles.maintenanceMode;
  const isAdminRoute = pathname?.startsWith('/admin');

  if (isMaintenanceActive && !adminUser && !isAdminRoute) {
    return (
      <div className="min-h-screen w-full bg-main-gradient flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="max-w-md w-full text-center glass-effect rounded-3xl p-8 border border-primary-500/30 shadow-2xl shadow-primary-900/30"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-200">
            <Wrench size={32} />
          </div>
          <h1 className="text-2xl font-bold text-dark-50 mb-2">
            {controlSettings.maintenanceHeadline || DEFAULT_CONTROL_CENTER_SETTINGS.maintenanceHeadline}
          </h1>
          <p className="text-sm text-dark-300 mb-6 whitespace-pre-line">
            {controlSettings.maintenanceMessage || DEFAULT_CONTROL_CENTER_SETTINGS.maintenanceMessage}
          </p>
          <div className="glass-effect rounded-2xl p-4 mb-6 border border-dark-700/60 text-left">
            <div className="flex items-center space-x-3 text-dark-300">
              <Clock size={18} className="text-primary-300" />
              <p className="text-sm">
                {controlSettings.maintenanceSupportNote || DEFAULT_CONTROL_CENTER_SETTINGS.maintenanceSupportNote}
              </p>
            </div>
          </div>
          <div className="space-y-3 text-sm text-dark-200">
            <a
              href={normalizedWhatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 rounded-xl bg-primary-500/20 border border-primary-500/40 py-3 text-primary-100 hover:bg-primary-500/30 transition-colors"
            >
              <MessageCircle size={18} />
              <span>{loadingSupport ? 'Opening WhatsApp...' : controlSettings.supportWhatsapp}</span>
            </a>
            <a
              href={`mailto:${controlSettings.supportEmail}`}
              className="flex items-center justify-center space-x-2 rounded-xl bg-dark-900/60 border border-dark-700/60 py-3 hover:bg-dark-900 transition-colors"
            >
              <ShieldAlert size={18} className="text-accent-300" />
              <span>{loadingSupport ? 'Loading email...' : controlSettings.supportEmail}</span>
            </a>
            <p className="text-xs text-dark-400">
              Availability: {loadingSupport ? 'Syncing hours...' : controlSettings.officeHours}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}


