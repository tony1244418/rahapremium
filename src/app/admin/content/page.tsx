'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ContentForm from '@/components/admin/ContentForm';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformControls } from '@/contexts/PlatformControlContext';
import { adminFetch } from '@/lib/api-client';
import { 
  Film, 
  Tv, 
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Eye,
  Edit,
  Trash2,
  Upload,
  Calendar,
  Clock,
  Star,
  Users,
  Play,
  RefreshCw,
  AlertCircle,
  X,
  CloudLightning,
  Gamepad2,
  DollarSign,
  ArrowUpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getContentStats,
  subscribeToMovies,
  subscribeToAllMovies,
  subscribeToSeries,
  getAllMovies,
  getSeries,
  addMovie,
  addSeries,
  updateMovie,
  updateSeries,
  deleteMovie,
  deleteSeries,
  postMovieNow,
  formatDuration,
  getContentTypeIcon,
  getContentTypeColor
} from '@/lib/content-management';
import {
  subscribeToGames,
  addGame,
  updateGame,
  deleteGame
} from '@/lib/games';
import SeasonsManager from '@/components/admin/SeasonsManager';
import GameForm from '@/components/admin/GameForm';
import { Loading } from '@/components/ui/Loading';
import { Movie, Series, Game } from '@/types';

type ContentItem = Movie | Series | Game;

type ContentSyncSummaryResponse = {
  moviesChecked: number;
  moviesUpdated: number;
  seriesChecked: number;
  seriesUpdated: number;
  storiesChecked: number;
  storiesUpdated: number;
  totalChecked: number;
  totalUpdated: number;
  durationMs: number;
};

type ContentSyncStatusResponse = {
  status: 'idle' | 'running';
  runningSince: string | null;
  lastRunAt: string | null;
  lastRunSource: 'auto' | 'manual' | null;
  lastRunBy: string | null;
  lastRunSummary: ContentSyncSummaryResponse | null;
  lastError: string | null;
};

const AUTO_SYNC_INTERVAL_MS = 1000 * 60 * 60 * 2; // 2 hours

const formatDateTime = (iso: string | null) => {
  if (!iso) return 'Never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

const formatSyncDuration = (durationMs: number) => {
  if (!durationMs || Number.isNaN(durationMs)) return '—';
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }
  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) {
    return `${seconds} sec`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.round(minutes / 60);
  return `${hours} hr`;
};

const formatRelativeFutureTime = (date: Date | null) => {
  if (!date) return 'soon';
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return 'soon';
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 60) {
    return `in ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `in ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
  }
  const diffDays = Math.round(diffHours / 24);
  return `in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
};

export default function AdminContentPage() {
  const { t } = useLanguage();
  const { adminUser } = useAuth();
  const { toggles: platformToggles } = usePlatformControls();
  const [activeTab, setActiveTab] = useState<'movies' | 'series' | 'games'>('movies');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'draft'>('all');
  
  // Data states
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check URL params for auto-open actions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const tab = params.get('tab');
      if (action === 'add') {
        if (tab === 'movies' || tab === 'series' || tab === 'games') {
          setActiveTab(tab as 'movies' | 'series' | 'games');
        }
        setShowForm(true);
        setEditingItem(null);
        // Clean up the URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Content sync states
  const [contentSyncStatus, setContentSyncStatus] = useState<ContentSyncStatusResponse | null>(null);
  const [contentSyncLoading, setContentSyncLoading] = useState(false);
  const [contentSyncError, setContentSyncError] = useState<string | null>(null);
  const contentSyncStatusRef = useRef<ContentSyncStatusResponse | null>(null);
  const syncInFlightRef = useRef(false);
  const autoSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchContentSyncStatus = useCallback(async () => {
    try {
      const response = await adminFetch('/api/admin/content/sync');
      const payload = await response.json();

      if (response.ok && payload.success) {
        setContentSyncStatus(payload.status);
        contentSyncStatusRef.current = payload.status;
        setContentSyncError(null);
      } else {
        if (payload?.status) {
          setContentSyncStatus(payload.status);
          contentSyncStatusRef.current = payload.status;
        }
        setContentSyncError(payload?.error || 'Failed to load content sync status.');
      }
    } catch (err) {
      console.error('Error fetching content sync status:', err);
      setContentSyncError(err instanceof Error ? err.message : 'Failed to load content sync status.');
    }
  }, []);

  const triggerContentSync = useCallback(
    async (
      source: 'manual' | 'auto',
      options: { silent?: boolean; skipIfRunning?: boolean } = {}
    ) => {
      const status = contentSyncStatusRef.current;

      if (options.skipIfRunning && status?.status === 'running') {
        return;
      }

      if (syncInFlightRef.current) {
        if (!options.silent && !options.skipIfRunning) {
          setContentSyncError('Content sync is already running.');
        }
        return;
      }

      syncInFlightRef.current = true;

      if (!options.silent) {
        setContentSyncLoading(true);
        setContentSyncError(null);
      }

      try {
        const response = await adminFetch('/api/admin/content/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            source,
            requestedBy: adminUser?.uid ?? null
          })
        });

        const payload = await response.json();

        if (response.ok && payload.success) {
          setContentSyncStatus(payload.status);
          contentSyncStatusRef.current = payload.status;
          if (!options.silent) {
            setContentSyncError(null);
          }
        } else {
          if (payload?.status) {
            setContentSyncStatus(payload.status);
            contentSyncStatusRef.current = payload.status;
          }
          if (!options.silent) {
            setContentSyncError(payload?.error || 'Failed to synchronise content.');
          }
        }
      } catch (err) {
        console.error('Content sync request failed:', err);
        if (!options.silent) {
          setContentSyncError(err instanceof Error ? err.message : 'Failed to synchronise content.');
        }
      } finally {
        syncInFlightRef.current = false;
        if (!options.silent) {
          setContentSyncLoading(false);
        }
        fetchContentSyncStatus();
      }
    },
    [adminUser?.uid, fetchContentSyncStatus]
  );
  
  // Seasons management
  const [showSeasonsManager, setShowSeasonsManager] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);

  // Load content stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const result = await getContentStats();
        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };
    loadStats();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribeMovies = subscribeToMovies((data) => {
      setMovies(data);
      setLoading(false);
    });

    const unsubscribeSeries = subscribeToSeries((data) => {
      setSeries(data);
    });

    const unsubscribeGames = subscribeToGames((data) => {
      setGames(data);
    });

    return () => {
      unsubscribeMovies();
      unsubscribeSeries();
      unsubscribeGames();
    };
  }, []);

  useEffect(() => {
    fetchContentSyncStatus();
    const interval = setInterval(fetchContentSyncStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchContentSyncStatus]);

  useEffect(() => {
    if (!platformToggles.autoContentSync) {
      if (autoSyncTimeoutRef.current) {
        clearTimeout(autoSyncTimeoutRef.current);
        autoSyncTimeoutRef.current = null;
      }
      return;
    }

    const scheduleAutoSync = () => {
      if (autoSyncTimeoutRef.current) {
        clearTimeout(autoSyncTimeoutRef.current);
        autoSyncTimeoutRef.current = null;
      }

      const status = contentSyncStatusRef.current;
      const now = Date.now();
      let delay = 0;

      if (status?.status === 'running') {
        delay = AUTO_SYNC_INTERVAL_MS;
      } else if (status?.lastRunAt) {
        const lastRunTime = new Date(status.lastRunAt).getTime();
        if (!Number.isNaN(lastRunTime)) {
          const elapsed = now - lastRunTime;
          delay = elapsed >= AUTO_SYNC_INTERVAL_MS ? 0 : AUTO_SYNC_INTERVAL_MS - elapsed;
        }
      }

      autoSyncTimeoutRef.current = setTimeout(async () => {
        if (!platformToggles.autoContentSync) return;
        await triggerContentSync('auto', { silent: true, skipIfRunning: true });
        scheduleAutoSync();
      }, Math.max(0, delay));
    };

    scheduleAutoSync();

    return () => {
      if (autoSyncTimeoutRef.current) {
        clearTimeout(autoSyncTimeoutRef.current);
        autoSyncTimeoutRef.current = null;
      }
    };
  }, [platformToggles.autoContentSync, triggerContentSync, contentSyncStatus?.lastRunAt, contentSyncStatus?.status]);

  const getCurrentContent = (): ContentItem[] => {
    switch (activeTab) {
      case 'movies': return movies;
      case 'series': return series;
      case 'games': return games;
      default: return [];
    }
  };

  const filteredContent = getCurrentContent().filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ('description' in item ? item.description.toLowerCase().includes(searchQuery.toLowerCase()) : false);
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' ? item.isActive : !item.isActive);
    return matchesSearch && matchesStatus;
  });

  const handleAddContent = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEditContent = (item: ContentItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDeleteContent = async (item: ContentItem) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"? This action cannot be undone.`)) {
      return;
    }

    setActionLoading(item.id);
    setError(null);

    try {
      let result;
      if (activeTab === 'movies') {
        result = await deleteMovie(item.id);
      } else if (activeTab === 'series') {
        result = await deleteSeries(item.id);
      } else {
        result = await deleteGame(item.id);
      }

      if (!result.success) {
        setError(result.error || 'Failed to delete content');
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      setError('Failed to delete content');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePostNow = async (item: ContentItem) => {
    if (activeTab !== 'movies') return;
    if (!confirm(`Are you sure you want to "Post Now" for "${item.title}"? This will update its date to right now so it appears at the top.`)) {
      return;
    }

    setActionLoading(`postnow-${item.id}`);
    setError(null);

    try {
      const result = await postMovieNow(item.id);
      if (!result.success) {
        setError(result.error || 'Failed to post movie now');
      } else {
        await refreshCurrentTab();
      }
    } catch (error) {
      console.error('Error posting movie now:', error);
      setError('Failed to post movie now');
    } finally {
      setActionLoading(null);
    }
  };

  const refreshCurrentTab = async () => {
    if (activeTab === 'movies') {
      const res = await getAllMovies();
      if (res.success && res.data) setMovies(res.data);
    } else if (activeTab === 'series') {
      const res = await getSeries();
      if (res.success && res.data) setSeries(res.data);
    }
  };

  const handleFormSubmit = async (formData: any) => {
    setFormLoading(true);
    setError(null);

    try {
      let result;
      if (activeTab === 'movies') {
        if (editingItem) {
          result = await updateMovie(editingItem.id, formData);
        } else {
          result = await addMovie(formData);
        }
      } else if (activeTab === 'series') {
        if (editingItem) {
          result = await updateSeries(editingItem.id, formData);
        } else {
          result = await addSeries(formData);
        }
      } else {
        if (editingItem) {
          result = await updateGame(editingItem.id, formData);
        } else {
          result = await addGame(formData);
        }
      }

      if (result.success) {
        setShowForm(false);
        setEditingItem(null);
        // Immediately refresh list (don't rely only on real-time subscription)
        await refreshCurrentTab();
      } else {
        setError(result.error || 'Failed to save content');
      }
    } catch (error) {
      console.error('Error saving content:', error);
      setError('Failed to save content');
    } finally {
      setFormLoading(false);
    }
  };

  const handleManageSeasons = (series: Series) => {
    setSelectedSeries(series);
    setShowSeasonsManager(true);
  };

  const contentTabs = [
    {
      id: 'movies' as const,
      label: 'Movies',
      icon: Film,
      count: movies.length,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20'
    },
    {
      id: 'series' as const,
      label: 'TV Series',
      icon: Tv,
      count: series.length,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      id: 'games' as const,
      label: 'Games',
      icon: Gamepad2,
      count: games.length,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20'
    }
  ];

  const getContentDuration = (item: ContentItem) => {
    // Check if it's a game (has downloadLink and requiredPackages)
    if ('downloadLink' in item && 'requiredPackages' in item) {
      // Games don't have duration - they use subscription packages
      return '';
    }
    
    if ('duration' in item) {
      // It's a movie - duration is in minutes (may be null if not set)
      return item.duration ? formatDuration(item.duration) : '';
    } else if ('totalSeasons' in item) {
      return `${item.totalSeasons} season${item.totalSeasons > 1 ? 's' : ''}`;
    }
    return '';
  };

  const getContentType = (item: ContentItem): 'movie' | 'series' | 'game' => {
    // Check for game first (has downloadLink and requiredPackages)
    if ('downloadLink' in item && 'requiredPackages' in item) return 'game';
    if ('totalSeasons' in item) return 'series';
    return 'movie';
  };

  const isSyncRunning = contentSyncStatus?.status === 'running';
  const lastRunSummary = contentSyncStatus?.lastRunSummary ?? null;
  const lastRunAtLabel = formatDateTime(contentSyncStatus?.lastRunAt || null);
  const lastRunSource = contentSyncStatus?.lastRunSource ?? null;
  const nextAutoRunDate = platformToggles.autoContentSync
    ? (() => {
        if (isSyncRunning) {
          return new Date(Date.now() + AUTO_SYNC_INTERVAL_MS);
        }
        if (contentSyncStatus?.lastRunAt) {
          const lastRun = new Date(contentSyncStatus.lastRunAt);
          if (!Number.isNaN(lastRun.getTime())) {
            return new Date(lastRun.getTime() + AUTO_SYNC_INTERVAL_MS);
          }
        }
        return null;
      })()
    : null;
  const nextAutoRunLabel = nextAutoRunDate ? formatRelativeFutureTime(nextAutoRunDate) : 'soon';
  const canRunManualSync = !contentSyncLoading && !isSyncRunning;

  if (loading) {
    return (
      <div className="container-mobile flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="relative">
                <div className="absolute inset-0 water-ripple"></div>
                <Loading size="lg" text="Loading content..." variant="splash" />
              </div>
            </div>
          </div>
    );
  }

  return (
    <div className="container-mobile space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-4">
            <div>
              <h1 className="text-responsive-2xl font-bold text-gradient">
                Content Management
              </h1>
              <p className="text-dark-400">
                Manage movies, series, and games
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={() => {
                  setActiveTab('games');
                  setShowForm(true);
                  setEditingItem(null);
                }}
                className="button-secondary flex-1 sm:flex-none flex items-center justify-center space-x-2"
              >
                <Gamepad2 size={20} />
                <span>Add Game</span>
              </button>
              <button 
                onClick={handleAddContent}
                className="button-primary flex-1 sm:flex-none flex items-center justify-center space-x-2"
              >
                <Plus size={20} />
                <span>Add Content</span>
              </button>
            </div>
          </div>

          {/* Auto Content Sync Status */}
          <div className="glass-effect rounded-lg p-4 space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between">
            <div className="flex-1 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-500/20 text-primary-300 rounded-lg flex items-center justify-center">
                  <CloudLightning size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-dark-100">
                    Auto Content Sync
                  </p>
                  <p className="text-xs text-dark-400">
                    {platformToggles.autoContentSync
                      ? 'Keeps Google Drive playlists and metadata refreshed every 2 hours.'
                      : 'Auto sync is disabled. Enable it in System Settings to refresh metadata automatically.'}
                  </p>
                </div>
              </div>

              <div className="text-xs text-dark-500 space-y-1">
                <p>
                  Last run: {lastRunAtLabel}
                  {lastRunSource ? ` (${lastRunSource})` : ''}
                </p>
                {lastRunSummary && (
                  <p>
                    Updated {lastRunSummary.totalUpdated}/{lastRunSummary.totalChecked} items · {formatSyncDuration(lastRunSummary.durationMs)}
                  </p>
                )}
                {platformToggles.autoContentSync && (
                  <p>
                    Next auto run {nextAutoRunDate ? nextAutoRunLabel : 'soon'}
                  </p>
                )}
                {contentSyncStatus?.lastError && (
                  <p className="text-red-400">
                    Last error: {contentSyncStatus.lastError}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-stretch sm:items-end gap-2 sm:ml-6">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    platformToggles.autoContentSync
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-dark-800 text-dark-400'
                  }`}
                >
                  {platformToggles.autoContentSync ? 'Auto mode ON' : 'Auto mode OFF'}
                </span>
                {isSyncRunning && (
                  <span className="text-xs text-primary-300 flex items-center gap-1">
                    <RefreshCw size={14} className="animate-spin" />
                    Running…
                  </span>
                )}
              </div>

              <button
                onClick={() => triggerContentSync('manual')}
                disabled={!canRunManualSync}
                className="button-primary px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {contentSyncLoading ? 'Syncing...' : 'Run Sync Now'}
              </button>

              {contentSyncError && (
                <p className="text-xs text-red-400 max-w-xs text-right">
                  {contentSyncError}
                </p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="glass-effect rounded-lg p-4 border border-red-500/50">
              <div className="flex items-center space-x-3">
                <AlertCircle size={20} className="text-red-400" />
                <p className="text-red-400">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-300"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Content Tabs */}
          <div className="glass-effect rounded-lg p-1">
            <div className="flex space-x-1">
              {contentTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-primary-500 text-white'
                        : 'text-dark-300 hover:text-dark-100 hover:bg-dark-800/50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{tab.label}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      activeTab === tab.id ? 'bg-white/20' : tab.bgColor + ' ' + tab.color
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="glass-effect rounded-lg p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus-ring"
                  placeholder={t('searchContent')}
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                  className="bg-dark-800 border border-dark-600 rounded-lg px-4 py-3 text-dark-100"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <div className="flex bg-dark-800 border border-dark-600 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-3 ${viewMode === 'grid' ? 'bg-primary-500 text-white' : 'text-dark-400 hover:text-dark-100'}`}
                  >
                    <Grid size={20} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-3 ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-dark-400 hover:text-dark-100'}`}
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content Grid/List */}
          {filteredContent.length === 0 ? (
            <div className="glass-effect rounded-lg p-8 text-center">
              <Film size={48} className="mx-auto text-dark-600 mb-4" />
              <h3 className="text-lg font-semibold text-dark-300 mb-2">
                No content found
              </h3>
              <p className="text-dark-400">
                Try adjusting your search criteria or add new content
              </p>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
            }>
              {filteredContent.map((item, index) => {
                const contentType = getContentType(item);
                const typeColor = getContentTypeColor(contentType);
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`glass-effect rounded-lg overflow-hidden hover:bg-dark-800/30 transition-all duration-200 group ${
                      viewMode === 'list' ? 'flex' : ''
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className={`relative ${viewMode === 'list' ? 'w-32 h-20 flex-shrink-0' : 'aspect-video'}`}>
                      <div className="w-full h-full bg-dark-700 flex items-center justify-center">
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className="w-full h-full flex items-center justify-center hidden">
                          <Play size={32} className="text-dark-500" />
                        </div>
                      </div>
                      <div className="absolute top-2 left-2">
                        <span className={`text-xs px-2 py-1 rounded ${typeColor}`}>
                          {getContentTypeIcon(contentType)} {contentType.toUpperCase()}
                        </span>
                      </div>
                      <div className="absolute top-2 right-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          item.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      {contentType !== 'game' && (
                      <div className="absolute bottom-2 right-2">
                        <div className="flex items-center space-x-1 bg-black/50 rounded px-2 py-1">
                          <Star size={12} className="text-yellow-400" />
                            <span className="text-xs text-white">
                              {(item as Movie | Series).rating || 0}
                            </span>
                        </div>
                      </div>
                      )}
                    </div>

                    {/* Content Info */}
                    <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                      <h3 className="font-semibold text-dark-100 mb-2 group-hover:text-primary-400 transition-colors duration-200 line-clamp-2">
                        {item.title}
                      </h3>
                      
                      {item.genre && item.genre.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {item.genre.slice(0, 3).map((g, idx) => (
                          <span key={idx} className="text-xs bg-dark-700 text-dark-300 px-2 py-1 rounded">
                            {g}
                          </span>
                        ))}
                        {item.genre.length > 3 && (
                          <span className="text-xs bg-dark-700 text-dark-300 px-2 py-1 rounded">
                            +{item.genre.length - 3}
                          </span>
                        )}
                      </div>
                      )}

                      <div className="flex items-center justify-between text-sm text-dark-400 mb-3">
                        <div className="flex items-center space-x-1 flex-wrap gap-1">
                          {contentType === 'game' && 'requiredPackages' in item ? (
                            <>
                              {'isFree' in item && item.isFree ? (
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-bold">
                                  FREE
                                </span>
                              ) : (
                                <>
                                  {item.requiredPackages.slice(0, 2).map((pkg) => (
                                    <span key={pkg} className="px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded text-xs">
                                      {pkg}
                                    </span>
                                  ))}
                                  {item.requiredPackages.length > 2 && (
                                    <span className="text-xs">+{item.requiredPackages.length - 2}</span>
                                  )}
                                </>
                              )}
                              {'mode' in item && item.mode && (
                                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-xs">
                                  {item.mode}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <Clock size={14} />
                              <span>{getContentDuration(item)}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users size={14} />
                          <span>{item.views.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-dark-500">
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        <div className="flex space-x-2">
                          {contentType === 'series' && (
                            <button 
                              onClick={() => handleManageSeasons(item as Series)}
                              className="text-dark-400 hover:text-blue-400 transition-colors"
                              title="Manage Seasons"
                            >
                              <Tv size={16} />
                            </button>
                          )}
                          {contentType === 'movie' && (
                            <button 
                              onClick={() => handlePostNow(item)}
                              disabled={actionLoading === `postnow-${item.id}`}
                              className="text-dark-400 hover:text-green-400 transition-colors disabled:opacity-50"
                              title="Post Now (Move to Top)"
                            >
                              {actionLoading === `postnow-${item.id}` ? (
                                <RefreshCw size={16} className="animate-spin" />
                              ) : (
                                <ArrowUpCircle size={16} />
                              )}
                            </button>
                          )}
                          <button 
                            onClick={() => handleEditContent(item)}
                            className="text-dark-400 hover:text-yellow-400 transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteContent(item)}
                            disabled={actionLoading === item.id}
                            className="text-dark-400 hover:text-red-400 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {actionLoading === item.id ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Quick Stats */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-effect rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <Film size={20} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-dark-100">{stats.totalMovies}</p>
                    <p className="text-sm text-dark-400">Total Movies</p>
                  </div>
                </div>
              </div>
              
              <div className="glass-effect rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Tv size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-dark-100">{stats.totalSeries}</p>
                    <p className="text-sm text-dark-400">TV Series</p>
                  </div>
                </div>
              </div>
              
              <div className="glass-effect rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Upload size={20} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-dark-100">{stats.totalContent}</p>
                    <p className="text-sm text-dark-400">Total Content</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content Form Modal */}
          {activeTab === 'games' ? (
            <GameForm
              isOpen={showForm}
              onClose={() => {
                setShowForm(false);
                setEditingItem(null);
              }}
              onSubmit={handleFormSubmit}
              editData={editingItem as Game | null}
              loading={formLoading}
            />
          ) : (
            <ContentForm
              isOpen={showForm}
              onClose={() => {
                setShowForm(false);
                setEditingItem(null);
              }}
              onSubmit={handleFormSubmit}
              type={activeTab === 'movies' ? 'movie' : 'series'}
              editData={editingItem && 'downloadLink' in editingItem ? null : (editingItem as Movie | Series | null)}
              loading={formLoading}
            />
          )}

          {/* Seasons Manager Modal */}
          {selectedSeries && (
            <SeasonsManager
              isOpen={showSeasonsManager}
              onClose={() => {
                setShowSeasonsManager(false);
                setSelectedSeries(null);
              }}
              series={selectedSeries}
            />
          )}
        </div>
  );
}