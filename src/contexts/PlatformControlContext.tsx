'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  AdminToggleKey,
  AdminToggleSettings,
  DEFAULT_ADMIN_TOGGLE_SETTINGS,
  getAdminToggleSettings
} from '@/lib/admin-settings';

type PlatformControlContextValue = {
  toggles: AdminToggleSettings;
  loading: boolean;
  lastUpdated: Date | null;
  updatedBy: string | null;
  error: string | null;
  isToggleSaving: (key: AdminToggleKey) => boolean;
  setToggleSaving: (key: AdminToggleKey | null) => void;
};

const PlatformControlContext = createContext<PlatformControlContextValue | undefined>(undefined);

interface PlatformControlProviderProps {
  children: React.ReactNode;
}

export function PlatformControlProvider({ children }: PlatformControlProviderProps) {
  const [toggles, setToggles] = useState<AdminToggleSettings>(DEFAULT_ADMIN_TOGGLE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingToggleKey, setSavingToggleKey] = useState<AdminToggleKey | null>(null);

  useEffect(() => {
    // Initial load
    const load = async () => {
      try {
        const result = await getAdminToggleSettings();
        setToggles(result.values);
        setLastUpdated(result.updatedAt);
        setUpdatedBy(result.updatedBy);
        setError(null);
      } catch (err) {
        console.error('PlatformControlProvider: failed to load toggles', err);
        setError('Failed to load platform controls. Some features may be unavailable.');
        setToggles(DEFAULT_ADMIN_TOGGLE_SETTINGS);
      } finally {
        setLoading(false);
      }
    };

    load();

    // Real-time updates via Supabase Realtime
    const channelId = `admin-toggles-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_settings', filter: 'id=eq.toggleControls' },
        (payload) => {
          const row = payload.new as any;
          if (!row || !row.data) return;

          const toggleData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
          const nextValues = { ...DEFAULT_ADMIN_TOGGLE_SETTINGS };
          (Object.keys(nextValues) as AdminToggleKey[]).forEach((key) => {
            if (typeof toggleData[key] === 'boolean') {
              nextValues[key] = toggleData[key] as boolean;
            }
          });

          setToggles(nextValues);
          setLastUpdated(row.updated_at ? new Date(row.updated_at) : null);
          setUpdatedBy(row.updated_by ?? null);
          setError(null);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('PlatformControlProvider: realtime subscription error', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const contextValue = useMemo<PlatformControlContextValue>(
    () => ({
      toggles,
      loading,
      lastUpdated,
      updatedBy,
      error,
      isToggleSaving: (key: AdminToggleKey) => savingToggleKey === key,
      setToggleSaving: setSavingToggleKey
    }),
    [toggles, loading, lastUpdated, updatedBy, error, savingToggleKey]
  );

  return (
    <PlatformControlContext.Provider value={contextValue}>
      {children}
    </PlatformControlContext.Provider>
  );
}

export function usePlatformControls(): PlatformControlContextValue {
  const context = useContext(PlatformControlContext);
  if (!context) {
    throw new Error('usePlatformControls must be used within a PlatformControlProvider');
  }
  return context;
}
