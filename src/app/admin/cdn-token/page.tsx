'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Key, Eye, EyeOff, Edit2, Save, AlertCircle, RefreshCw, Clock, CheckCircle, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function CDNTokenManagementPage() {
  const [token, setToken] = useState('');
  const [originalToken, setOriginalToken] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [lastUpdatedRaw, setLastUpdatedRaw] = useState<Date | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [isManual, setIsManual] = useState(false);
  const [nextRefreshIn, setNextRefreshIn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { adminUser } = useAuth();

  const computeNextRefresh = useCallback((updatedAt: Date | null) => {
    if (!updatedAt) return;
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
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
          setOriginalToken(parsedData.token);
          setIsManual(parsedData.isManual === true);
        } else {
          setToken('9mtbtkZuZYH3TvzrMcC4Mgu6CpuN0ogV');
          setOriginalToken('9mtbtkZuZYH3TvzrMcC4Mgu6CpuN0ogV');
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
        setOriginalToken('9mtbtkZuZYH3TvzrMcC4Mgu6CpuN0ogV');
      }
    } catch (err: any) {
      console.error('Error fetching CDN token:', err);
      setError('Failed to load the CDN token.');
    } finally {
      setIsLoading(false);
    }
  }, [computeNextRefresh]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Keep the "next refresh" countdown live
  useEffect(() => {
    if (!lastUpdatedRaw || isManual) return;
    const interval = setInterval(() => computeNextRefresh(lastUpdatedRaw), 60000);
    return () => clearInterval(interval);
  }, [lastUpdatedRaw, isManual, computeNextRefresh]);

  const handleSave = async () => {
    if (!token.trim()) {
      setError('Token cannot be empty.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const now = new Date().toISOString();
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          id: 'cdn_token',
          data: { token: token.trim(), isManual: true },
          updated_at: now,
          updated_by: adminUser?.uid || 'admin',
        });

      if (error) throw error;

      setOriginalToken(token.trim());
      const d = new Date(now);
      setLastUpdatedRaw(d);
      setLastUpdated(d.toLocaleString());
      setUpdatedBy(adminUser?.uid || 'admin');
      setIsManual(true);
      setIsEditing(false);
      setSuccess('CDN Token updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving CDN token:', err);
      setError('Failed to save the CDN token. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleForceRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      setSuccess(null);

      const res = await fetch('/api/cron/refresh-token');
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Refresh failed');
      }

      setSuccess('Token refreshed from remote source!');
      setTimeout(() => setSuccess(null), 4000);
      // Re-fetch to show updated token and timestamp
      await fetchToken();
    } catch (err: any) {
      setError('Failed to refresh token: ' + err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 mb-2">
            <Key className="text-red-500" size={28} />
            <h1 className="text-2xl font-bold text-white">Global CDN Token Management</h1>
          </div>
          <button
            onClick={handleForceRefresh}
            disabled={isRefreshing || isLoading}
            className="flex items-center space-x-2 bg-dark-800/60 hover:bg-dark-700 border border-dark-600/50 text-dark-300 hover:text-white font-medium px-4 py-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Force Refresh'}</span>
          </button>
        </div>
        <p className="text-dark-400">Secure your DASH/HLS streams with a global authentication token.</p>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Mode */}
        <div className="glass-effect rounded-xl p-4 border border-dark-700/50 flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${isManual ? 'bg-yellow-500/10' : 'bg-green-500/10'}`}>
            {isManual ? <Edit2 size={18} className="text-yellow-400" /> : <Zap size={18} className="text-green-400" />}
          </div>
          <div>
            <p className="text-xs text-dark-400 mb-0.5">Mode</p>
            <p className={`text-sm font-semibold ${isManual ? 'text-yellow-400' : 'text-green-400'}`}>
              {isManual ? 'Manual' : 'Auto-Refresh'}
            </p>
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
              <p className="text-xs text-dark-500 truncate max-w-[140px]">{lastUpdated}</p>
            )}
          </div>
        </div>

        {/* Next Auto-Refresh / Updated By */}
        <div className="glass-effect rounded-xl p-4 border border-dark-700/50 flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${isManual ? 'bg-dark-700' : 'bg-purple-500/10'}`}>
            <RefreshCw size={18} className={isManual ? 'text-dark-500' : 'text-purple-400'} />
          </div>
          <div>
            <p className="text-xs text-dark-400 mb-0.5">{isManual ? 'Updated By' : 'Next Auto-Refresh'}</p>
            <p className={`text-sm font-semibold ${isManual ? 'text-dark-300' : 'text-purple-400'}`}>
              {isLoading ? '...' : isManual ? (updatedBy || 'admin') : (nextRefreshIn || '—')}
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
                onChange={(e) => setToken(e.target.value)}
                disabled={!isEditing || isLoading}
                className="w-full bg-dark-800/50 border border-dark-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all disabled:opacity-70 font-mono"
                placeholder="Enter CDN token..."
              />
              <button
                type="button"
                onClick={() => setIsVisible(!isVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
              >
                {isVisible ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isEditing) {
                  setToken(originalToken);
                  setIsEditing(false);
                  setError(null);
                } else {
                  setIsEditing(true);
                }
              }}
              className={`p-3 rounded-xl border transition-all ${
                isEditing
                  ? 'bg-dark-700 border-dark-600 text-white'
                  : 'bg-dark-800/50 border-dark-600/50 text-dark-400 hover:text-white hover:bg-dark-700'
              }`}
              title={isEditing ? 'Cancel editing' : 'Edit token'}
            >
              <Edit2 size={20} />
            </button>
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

        <button
          onClick={handleSave}
          disabled={!isEditing || isSaving || isLoading || token === originalToken}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#20B2AA] hover:bg-[#20B2AA]/90 text-white font-medium px-6 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          <span>{isSaving ? 'Saving...' : 'Save Global Token'}</span>
        </button>

        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
          <p className="text-sm text-blue-200">
            <strong className="text-blue-400 font-semibold mr-1">Auto-Refresh:</strong>
            The token is automatically refreshed every <strong>6 hours</strong> from the remote source. You can also click <strong>Force Refresh</strong> to fetch a new token immediately.
          </p>
          <p className="text-sm text-blue-200">
            <strong className="text-blue-400 font-semibold mr-1">Manual Override:</strong>
            Saving a token manually will pin it and disable auto updates until the next cron cycle overwrites it.
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
