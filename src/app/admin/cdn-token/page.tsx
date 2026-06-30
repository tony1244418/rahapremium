'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Key, Eye, EyeOff, AlertCircle, RefreshCw, Clock, CheckCircle, Zap } from 'lucide-react';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export default function CDNTokenManagementPage() {
  const [token, setToken] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [lastUpdatedRaw, setLastUpdatedRaw] = useState<Date | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Guards so we don't fire refresh more than once per stale window
  const autoRefreshFiredRef = useRef(false);

  const computeNextRefresh = useCallback((updatedAt: Date | null) => {
    if (!updatedAt) return;
    const next = new Date(updatedAt.getTime() + SIX_HOURS_MS);
    const now = new Date();
    const diff = next.getTime() - now.getTime();
    if (diff <= 0) {
      setNextRefreshIn('Due now');
    } else {
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setNextRefreshIn(`${h}h ${m}m`);
    }
  }, []);

  const fetchToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: rawData, error } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('id', 'cdn_token')
        .single();

      const data = rawData as any;

      if (error && error.code !== 'PGRST116') throw error;

      if (data && data.data) {
        const parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
        if (parsedData && parsedData.token) {
          setToken(parsedData.token);
        } else {
          setToken('9mtbtkZuZYH3TvzrMcC4Mgu6CpuN0ogV');
        }

        if (data.updated_at) {
          const d = new Date(data.updated_at);
          setLastUpdatedRaw(d);
          setLastUpdated(d.toLocaleString());
          computeNextRefresh(d);
        }

        if (data.updated_by) {
          setUpdatedBy(data.updated_by);
        }
      } else {
        setToken('9mtbtkZuZYH3TvzrMcC4Mgu6CpuN0ogV');
      }
    } catch (err: any) {
      console.error('Error fetching CDN token:', err);
      setError('Failed to load the CDN token.');
    } finally {
      setIsLoading(false);
    }
  }, [computeNextRefresh]);

  // Trigger backend rotation. Silent unless user-invoked.
  const triggerRefresh = useCallback(async (silent = true) => {
    try {
      if (!silent) {
        setIsRefreshing(true);
        setError(null);
        setSuccess(null);
      }

      const res = await fetch('/api/cron/refresh-token');
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        throw new Error(json.error || `Refresh failed (${res.status})`);
      }

      if (!silent) {
        setSuccess('Token refreshed from remote source!');
        setTimeout(() => setSuccess(null), 4000);
      }
      await fetchToken();
    } catch (err: any) {
      if (!silent) {
        setError('Failed to refresh token: ' + err.message);
      } else {
        console.warn('[CDNToken] Auto-refresh failed:', err.message);
      }
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [fetchToken]);

  // Initial load
  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Auto-rotate on load if the token is older than 6 hours,
  // and keep ticking the countdown every minute.
  useEffect(() => {
    if (!lastUpdatedRaw) return;

    const checkAndMaybeRefresh = () => {
      computeNextRefresh(lastUpdatedRaw);
      const isStale = Date.now() - lastUpdatedRaw.getTime() >= SIX_HOURS_MS;
      if (isStale && !autoRefreshFiredRef.current && !isRefreshing) {
        autoRefreshFiredRef.current = true;
        triggerRefresh(true).finally(() => {
          // Allow another auto-fire after a minute window so back-to-back
          // failed attempts don't hammer the endpoint.
          setTimeout(() => { autoRefreshFiredRef.current = false; }, 60_000);
        });
      }
    };

    checkAndMaybeRefresh();
    const interval = setInterval(checkAndMaybeRefresh, 60_000);
    return () => clearInterval(interval);
  }, [lastUpdatedRaw, isRefreshing, triggerRefresh, computeNextRefresh]);

  const timeSince = (date: Date | null) => {
    if (!date) return '';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 border-b border-dark-700/50 pb-6">
        <div className="flex items-center space-x-3 mb-2">
          <Key className="text-red-500" size={28} />
          <h1 className="text-2xl font-bold text-white">Global CDN Token Management</h1>
        </div>
        <p className="text-dark-400">
          Token rotates automatically every 6 hours from the remote source. No manual action needed.
        </p>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Mode (always auto) */}
        <div className="glass-effect rounded-xl p-4 border border-dark-700/50 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Zap size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-xs text-dark-400 mb-0.5">Mode</p>
            <p className="text-sm font-semibold text-green-400">Auto-Refresh</p>
          </div>
        </div>

        {/* Last Changed */}
        <div className="glass-effect rounded-xl p-4 border border-dark-700/50 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Clock size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-dark-400 mb-0.5">Last Changed</p>
            <p className="text-sm font-semibold text-white" title={lastUpdated || ''}>
              {isLoading ? '...' : lastUpdatedRaw ? timeSince(lastUpdatedRaw) : 'Never'}
            </p>
            {lastUpdated && (
              <p className="text-xs text-dark-500 truncate max-w-[160px]">{lastUpdated}</p>
            )}
            {updatedBy && (
              <p className="text-xs text-dark-500 truncate max-w-[160px]">by {updatedBy}</p>
            )}
          </div>
        </div>

        {/* Next Auto-Refresh */}
        <div className="glass-effect rounded-xl p-4 border border-dark-700/50 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-primary-500/10">
            <RefreshCw size={18} className={`text-primary-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <p className="text-xs text-dark-400 mb-0.5">Next Auto-Refresh</p>
            <p className="text-sm font-semibold text-primary-400">
              {isLoading ? '...' : (nextRefreshIn || '—')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="glass-effect rounded-2xl p-6 border border-dark-700/50">
        <div className="mb-6">
          <label className="block text-sm font-medium text-dark-200 mb-2">
            Current Active Token
          </label>
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <input
                type={isVisible ? 'text' : 'password'}
                value={token}
                readOnly
                className="w-full bg-dark-800/50 border border-dark-600/50 rounded-xl px-4 py-3 text-white focus:outline-none font-mono opacity-90 cursor-default"
                placeholder="Loading token..."
              />
              <button
                type="button"
                onClick={() => setIsVisible(!isVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
              >
                {isVisible ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-400">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start space-x-3 text-green-400">
            <CheckCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm">{success}</p>
          </div>
        )}

        <div className="mt-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
          <p className="text-sm text-blue-200">
            <strong className="text-blue-400 font-semibold mr-1">Auto-Refresh:</strong>
            The token is automatically refreshed every <strong>6 hours</strong> from the remote source.
            This page also refreshes the token on load if it has expired.
          </p>
          <p className="text-sm text-blue-200">
            <strong className="text-blue-400 font-semibold mr-1">Usage:</strong>
            This token is appended to all stream URLs as <code className="bg-dark-800/50 px-1.5 py-0.5 rounded text-blue-300 mx-1">&cdntoken=VALUE</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
