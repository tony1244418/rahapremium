'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Calendar, 
  Clock, 
  Users, 
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Tv,
  Film
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Season, Episode, Series, VideoQuality } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  addSeason, 
  updateSeason, 
  deleteSeason, 
  getSeasonsBySeries,
  subscribeToSeasons,
  addEpisode,
  updateEpisode,
  deleteEpisode,
  getEpisodesBySeason,
  subscribeToEpisodes,
  formatDuration
} from '@/lib/content-management';

interface SeasonsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  series: Series;
}

interface SeasonFormData {
  seasonNumber: number;
  title: string;
  description: string;
  videoUrl?: string;
  downloadUrl?: string; // Direct download URL (e.g., Bunny CDN)
  googleDriveUrl?: string; // Keep for backward compatibility
  thumbnailUrl: string;
}

interface EpisodeFormData {
  episodeNumber: number;
  title: string;
  description: string;
  videoUrl?: string;
  downloadUrl?: string; // Direct download URL (e.g., Bunny CDN)
  googleDriveUrl?: string; // Keep for backward compatibility
  thumbnailUrl: string;
  duration: number;
  quality: VideoQuality[];
}

export default function SeasonsManager({ isOpen, onClose, series }: SeasonsManagerProps) {
  const { t } = useLanguage();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Record<string, Episode[]>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [showEpisodeForm, setShowEpisodeForm] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());
  
  // Form data
  const [seasonForm, setSeasonForm] = useState<SeasonFormData>({
    seasonNumber: 1,
    title: '',
    description: '',
    videoUrl: '',
    downloadUrl: '',
    googleDriveUrl: '',
    thumbnailUrl: ''
  });
  
  const [episodeForm, setEpisodeForm] = useState<EpisodeFormData>({
    episodeNumber: 1,
    title: '',
    description: '',
    videoUrl: '',
    googleDriveUrl: '',
    thumbnailUrl: '',
    duration: 0,
    quality: ['HD']
  });

  // Load seasons when component mounts
  useEffect(() => {
    if (isOpen && series.id) {
      loadSeasons();
    }
  }, [isOpen, series.id]);

  // Subscribe to seasons updates
  useEffect(() => {
    if (!series.id) return;
    
    const unsubscribe = subscribeToSeasons(series.id, (seasonsData) => {
      setSeasons(seasonsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [series.id]);

  // Subscribe to episodes updates for each season
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    
    seasons.forEach(season => {
      const unsubscribe = subscribeToEpisodes(season.id, (episodesData) => {
        setEpisodes(prev => ({
          ...prev,
          [season.id]: episodesData
        }));
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [seasons]);

  const loadSeasons = async () => {
    try {
      setLoading(true);
      const result = await getSeasonsBySeries(series.id);
      if (result.success) {
        setSeasons(result.data);
      } else {
        setError(result.error || 'Failed to load seasons');
      }
    } catch (error) {
      console.error('Error loading seasons:', error);
      setError('Failed to load seasons');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSeason = () => {
    setEditingSeason(null);
    setSeasonForm({
      seasonNumber: seasons.length + 1,
      title: '',
      description: '',
      videoUrl: '',
      downloadUrl: '',
      googleDriveUrl: '',
      thumbnailUrl: ''
    });
    setShowSeasonForm(true);
  };

  const handleEditSeason = (season: Season) => {
    setEditingSeason(season);
    setSeasonForm({
      seasonNumber: season.seasonNumber,
      title: season.title,
      description: season.description,
      videoUrl: season.videoUrl || season.googleDriveUrl || '',
      downloadUrl: season.downloadUrl || '',
      googleDriveUrl: season.googleDriveUrl || '',
      thumbnailUrl: season.thumbnailUrl || ''
    });
    setShowSeasonForm(true);
  };

  const handleDeleteSeason = async (season: Season) => {
    if (!confirm(`Are you sure you want to delete "${season.title}"? This will also delete all episodes in this season.`)) {
      return;
    }

    setActionLoading(season.id);
    setError(null);

    try {
      const result = await deleteSeason(season.id);
      if (!result.success) {
        setError(result.error || 'Failed to delete season');
      }
    } catch (error) {
      console.error('Error deleting season:', error);
      setError('Failed to delete season');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSeasonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('season-form');
    setError(null);

    try {
      const seasonData = {
        seriesId: series.id,
        ...seasonForm,
        totalEpisodes: 0
      };

      let result;
      if (editingSeason) {
        result = await updateSeason(editingSeason.id, seasonData);
      } else {
        result = await addSeason(seasonData);
      }

      if (result.success) {
        setShowSeasonForm(false);
        setEditingSeason(null);
        setSeasonForm({ seasonNumber: 1, title: '', description: '', videoUrl: '', downloadUrl: '', googleDriveUrl: '', thumbnailUrl: '' });
      } else {
        setError(result.error || 'Failed to save season');
      }
    } catch (error) {
      console.error('Error saving season:', error);
      setError('Failed to save season');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddEpisode = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    setEditingEpisode(null);
    setEpisodeForm({
      episodeNumber: (episodes[seasonId]?.length || 0) + 1,
      title: '',
      description: '',
      videoUrl: '',
      downloadUrl: '',
      googleDriveUrl: '',
      thumbnailUrl: '',
      duration: 0,
      quality: ['HD']
    });
    setShowEpisodeForm(true);
  };

  const handleEditEpisode = (episode: Episode) => {
    setSelectedSeasonId(episode.seasonId);
    setEditingEpisode(episode);
    setEpisodeForm({
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      description: episode.description,
      videoUrl: episode.videoUrl || episode.googleDriveUrl || '',
      downloadUrl: episode.downloadUrl || '',
      googleDriveUrl: episode.googleDriveUrl || '',
      thumbnailUrl: episode.thumbnailUrl,
      duration: episode.duration,
      quality: episode.quality
    });
    setShowEpisodeForm(true);
  };

  const handleDeleteEpisode = async (episode: Episode) => {
    if (!confirm(`Are you sure you want to delete "${episode.title}"?`)) {
      return;
    }

    setActionLoading(episode.id);
    setError(null);

    try {
      const result = await deleteEpisode(episode.id);
      if (!result.success) {
        setError(result.error || 'Failed to delete episode');
      }
    } catch (error) {
      console.error('Error deleting episode:', error);
      setError('Failed to delete episode');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEpisodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeasonId) return;

    setActionLoading('episode-form');
    setError(null);

    try {
      const episodeData = {
        seriesId: series.id,
        seasonId: selectedSeasonId,
        episodeNumber: episodeForm.episodeNumber,
        title: episodeForm.title,
        description: episodeForm.description,
        videoUrl: episodeForm.videoUrl || episodeForm.googleDriveUrl,
        downloadUrl: episodeForm.downloadUrl || '',
        googleDriveUrl: episodeForm.googleDriveUrl,
        thumbnailUrl: episodeForm.thumbnailUrl,
        duration: episodeForm.duration,
        quality: episodeForm.quality as VideoQuality[],
        // Inherit subscription requirements from parent series
        requiredPackages: series.requiredPackages || [],
        isAdult: series.isAdult || false
      };

      let result;
      if (editingEpisode) {
        result = await updateEpisode(editingEpisode.id, episodeData);
      } else {
        result = await addEpisode(episodeData);
      }

      if (result.success) {
        setShowEpisodeForm(false);
        setEditingEpisode(null);
        setSelectedSeasonId(null);
        setEpisodeForm({
          episodeNumber: 1,
          title: '',
          description: '',
          videoUrl: '',
          downloadUrl: '',
          googleDriveUrl: '',
          thumbnailUrl: '',
          duration: 0,
          quality: ['HD']
        });
      } else {
        setError(result.error || 'Failed to save episode');
      }
    } catch (error) {
      console.error('Error saving episode:', error);
      setError('Failed to save episode');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleSeasonExpansion = (seasonId: string) => {
    setExpandedSeasons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seasonId)) {
        newSet.delete(seasonId);
      } else {
        newSet.add(seasonId);
      }
      return newSet;
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="modal-overlay">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="modal-content max-w-6xl max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6 sticky top-0 bg-dark-900 py-4">
            <div>
              <h3 className="text-xl font-bold text-dark-100">
                {t('manageSeasons')} - {series.title}
              </h3>
              <p className="text-dark-400">
                {t('addSeason')} na {t('addEpisode')} kwa mfululizo huu
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-dark-400 hover:text-dark-100 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="glass-effect rounded-lg p-4 border border-red-500/50 mb-6">
              <div className="flex items-center space-x-3">
                <div className="text-red-400">{error}</div>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-300"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Add Season Button */}
          <div className="mb-6">
            <button
              onClick={handleAddSeason}
              className="button-primary flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>{t('addSeason')}</span>
            </button>
          </div>

          {/* Seasons List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={32} className="animate-spin text-primary-400" />
            </div>
          ) : seasons.length === 0 ? (
            <div className="glass-effect rounded-lg p-8 text-center">
              <Tv size={48} className="mx-auto text-dark-600 mb-4" />
              <h3 className="text-lg font-semibold text-dark-300 mb-2">
                {t('noSeasonsYet')}
              </h3>
              <p className="text-dark-400">
                {t('addSeason')} cha kwanza ili uanze
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {seasons.map((season) => {
                const isExpanded = expandedSeasons.has(season.id);
                const seasonEpisodes = episodes[season.id] || [];
                
                return (
                  <div key={season.id} className="glass-effect rounded-lg overflow-hidden">
                    {/* Season Header */}
                    <div className="p-4 border-b border-dark-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => toggleSeasonExpansion(season.id)}
                            className="text-dark-400 hover:text-dark-100 transition-colors"
                          >
                            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          </button>
                          {season.thumbnailUrl && (
                            <div className="w-12 h-8 rounded overflow-hidden flex-shrink-0">
                              <img
                                src={season.thumbnailUrl}
                                alt={season.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <h4 className="font-semibold text-dark-100">
                              {t('seasons')} {season.seasonNumber}: {season.title}
                            </h4>
                            <p className="text-sm text-dark-400">
                              {season.totalEpisodes} {t('totalEpisodes')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleAddEpisode(season.id)}
                            className="text-dark-400 hover:text-primary-400 transition-colors"
                            title="Add Episode"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={() => handleEditSeason(season)}
                            className="text-dark-400 hover:text-yellow-400 transition-colors"
                            title="Edit Season"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteSeason(season)}
                            disabled={actionLoading === season.id}
                            className="text-dark-400 hover:text-red-400 transition-colors disabled:opacity-50"
                            title="Delete Season"
                          >
                            {actionLoading === season.id ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Episodes List */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 space-y-3">
                            {seasonEpisodes.length === 0 ? (
                              <div className="text-center py-8">
                                <Film size={32} className="mx-auto text-dark-600 mb-2" />
                                <p className="text-dark-400">{t('noEpisodesYet')}</p>
                              </div>
                            ) : (
                              seasonEpisodes.map((episode) => (
                                <div key={episode.id} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-12 h-8 bg-dark-700 rounded flex items-center justify-center">
                                      <Play size={16} className="text-dark-400" />
                                    </div>
                                    <div>
                                      <h5 className="font-medium text-dark-100">
                                        {t('episode')} {episode.episodeNumber}: {episode.title}
                                      </h5>
                                      <div className="flex items-center space-x-4 text-sm text-dark-400">
                                        <div className="flex items-center space-x-1">
                                          <Clock size={14} />
                                          <span>{formatDuration(episode.duration)}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                          <Users size={14} />
                                          <span>{episode.views}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => handleEditEpisode(episode)}
                                      className="text-dark-400 hover:text-yellow-400 transition-colors"
                                      title="Edit Episode"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEpisode(episode)}
                                      disabled={actionLoading === episode.id}
                                      className="text-dark-400 hover:text-red-400 transition-colors disabled:opacity-50"
                                      title="Delete Episode"
                                    >
                                      {actionLoading === episode.id ? (
                                        <RefreshCw size={16} className="animate-spin" />
                                      ) : (
                                        <Trash2 size={16} />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}

          {/* Season Form Modal */}
          {showSeasonForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-dark-900 rounded-lg p-6 w-full max-w-md">
                <h4 className="text-lg font-semibold text-dark-100 mb-4">
                  {editingSeason ? t('editSeason') : t('addSeason')}
                </h4>
                <form onSubmit={handleSeasonSubmit} className="space-y-4">
                  <div>
                    <label className="form-label">{t('seasonNumber')}</label>
                    <input
                      type="number"
                      value={seasonForm.seasonNumber}
                      onChange={(e) => setSeasonForm(prev => ({ ...prev, seasonNumber: parseInt(e.target.value) || 1 }))}
                      className="form-input"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="form-label">{t('seasonTitle')}</label>
                    <input
                      type="text"
                      value={seasonForm.title}
                      onChange={(e) => setSeasonForm(prev => ({ ...prev, title: e.target.value }))}
                      className="form-input"
                      placeholder={t('seasonTitle')}
                    />
                  </div>
                  <div>
                    <label className="form-label">{t('seasonDescription')}</label>
                    <textarea
                      value={seasonForm.description}
                      onChange={(e) => setSeasonForm(prev => ({ ...prev, description: e.target.value }))}
                      className="form-input min-h-[100px]"
                      placeholder={t('seasonDescription')}
                    />
                  </div>
                  <div>
                    <label className="form-label">Video URL (Player)</label>
                    <input
                      type="url"
                      value={seasonForm.videoUrl || seasonForm.googleDriveUrl || ''}
                      onChange={(e) => setSeasonForm(prev => ({ ...prev, videoUrl: e.target.value, googleDriveUrl: e.target.value }))}
                      className="form-input"
                      placeholder="https://iframe.mediadelivery.net/play/552231/00dfddf1-9155-4a66-a192-fef3ea3202ff"
                    />
                    <p className="text-xs text-dark-400 mt-1">
                      Supports Bunny.net (MediaDelivery), Google Drive, YouTube, Vimeo, or direct video URLs
                    </p>
                  </div>
                  <div>
                    <label className="form-label">Download URL (Optional)</label>
                    <input
                      type="url"
                      value={seasonForm.downloadUrl || ''}
                      onChange={(e) => setSeasonForm(prev => ({ ...prev, downloadUrl: e.target.value }))}
                      className="form-input"
                      placeholder="https://vz-efe8986b-460.b-cdn.net/00dfddf1-9155-4a66-a192-fef3ea3202ff/original"
                    />
                    <p className="text-xs text-dark-400 mt-1">
                      💡 Bunny CDN direct download URL. Enables direct downloads without CDN blocking.
                    </p>
                  </div>
                  <div>
                    <label className="form-label">{t('thumbnailUrl')}</label>
                    <input
                      type="url"
                      value={seasonForm.thumbnailUrl}
                      onChange={(e) => setSeasonForm(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                      className="form-input"
                      placeholder="https://example.com/thumbnail.jpg"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowSeasonForm(false)}
                      className="button-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading === 'season-form'}
                      className="button-primary flex-1"
                    >
                      {actionLoading === 'season-form' ? 'Saving...' : editingSeason ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Episode Form Modal */}
          {showEpisodeForm && selectedSeasonId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-dark-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h4 className="text-lg font-semibold text-dark-100 mb-4">
                  {editingEpisode ? t('editEpisode') : t('addEpisode')}
                </h4>
                <form onSubmit={handleEpisodeSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">{t('episodeNumber')}</label>
                      <input
                        type="number"
                        value={episodeForm.episodeNumber}
                        onChange={(e) => setEpisodeForm(prev => ({ ...prev, episodeNumber: parseInt(e.target.value) || 1 }))}
                        className="form-input"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="form-label">{t('episodeDuration')}</label>
                      <input
                        type="number"
                        value={episodeForm.duration}
                        onChange={(e) => setEpisodeForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                        className="form-input"
                        min="1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">{t('episodeTitle')}</label>
                    <input
                      type="text"
                      value={episodeForm.title}
                      onChange={(e) => setEpisodeForm(prev => ({ ...prev, title: e.target.value }))}
                      className="form-input"
                      placeholder={t('episodeTitle')}
                    />
                  </div>
                  <div>
                    <label className="form-label">{t('episodeDescription')}</label>
                    <textarea
                      value={episodeForm.description}
                      onChange={(e) => setEpisodeForm(prev => ({ ...prev, description: e.target.value }))}
                      className="form-input min-h-[100px]"
                      placeholder={t('episodeDescription')}
                    />
                  </div>
                  <div>
                    <label className="form-label">Video URL (Player)</label>
                    <input
                      type="url"
                      value={episodeForm.videoUrl || episodeForm.googleDriveUrl || ''}
                      onChange={(e) => setEpisodeForm(prev => ({ ...prev, videoUrl: e.target.value, googleDriveUrl: e.target.value }))}
                      className="form-input"
                      placeholder="https://iframe.mediadelivery.net/play/552231/00dfddf1-9155-4a66-a192-fef3ea3202ff"
                    />
                    <p className="text-xs text-dark-400 mt-1">
                      Supports Bunny.net (MediaDelivery), Google Drive, YouTube, Vimeo, or direct video URLs
                    </p>
                  </div>
                  <div>
                    <label className="form-label">Download URL (Optional)</label>
                    <input
                      type="url"
                      value={episodeForm.downloadUrl || ''}
                      onChange={(e) => setEpisodeForm(prev => ({ ...prev, downloadUrl: e.target.value }))}
                      className="form-input"
                      placeholder="https://vz-efe8986b-460.b-cdn.net/00dfddf1-9155-4a66-a192-fef3ea3202ff/original"
                    />
                    <p className="text-xs text-dark-400 mt-1">
                      💡 Bunny CDN direct download URL. Enables direct downloads without CDN blocking.
                    </p>
                  </div>
                  <div>
                    <label className="form-label">{t('thumbnailUrl')}</label>
                    <input
                      type="url"
                      value={episodeForm.thumbnailUrl}
                      onChange={(e) => setEpisodeForm(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                      className="form-input"
                      placeholder="https://example.com/thumbnail.jpg"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowEpisodeForm(false)}
                      className="button-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading === 'episode-form'}
                      className="button-primary flex-1"
                    >
                      {actionLoading === 'episode-form' ? 'Saving...' : editingEpisode ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
