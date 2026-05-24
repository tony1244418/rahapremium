'use client';

import React, { useState, useEffect } from 'react';
import GameForm from '@/components/admin/GameForm';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Gamepad2,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Eye,
  Edit,
  Trash2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getGames,
  subscribeToGames,
  addGame,
  updateGame,
  deleteGame
} from '@/lib/games';
import { Loading } from '@/components/ui/Loading';
import { Game } from '@/types';

export default function AdminGamesPage() {
  const { t } = useLanguage();
  const { adminUser } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = subscribeToGames((gamesData) => {
      setGames(gamesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddGame = () => {
    setEditingGame(null);
    setShowForm(true);
    setError(null);
  };

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setShowForm(true);
    setError(null);
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm(t('deleteGame') + '?')) {
      return;
    }

    setActionLoading(gameId);
    setError(null);

    try {
      const result = await deleteGame(gameId);
      if (!result.success) {
        setError(result.error || 'Failed to delete game');
      }
    } catch (error) {
      console.error('Error deleting game:', error);
      setError('Failed to delete game');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFormSubmit = async (formData: any) => {
    setFormLoading(true);
    setError(null);

    try {
      let result;
      if (editingGame) {
        result = await updateGame(editingGame.id, formData);
      } else {
        result = await addGame(formData);
      }

      if (result.success) {
        setShowForm(false);
        setEditingGame(null);
      } else {
        setError(result.error || 'Failed to save game');
      }
    } catch (error) {
      console.error('Error saving game:', error);
      setError('Failed to save game');
    } finally {
      setFormLoading(false);
    }
  };

  // Filter games
  const filteredGames = games.filter(game => {
    const matchesSearch = !searchQuery || 
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && game.isActive) ||
      (filterStatus === 'inactive' && !game.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const activeGamesCount = games.filter(g => g.isActive).length;
  const inactiveGamesCount = games.filter(g => !g.isActive).length;

  if (loading) {
    return (
      <div className="container-mobile flex items-center justify-center min-h-96">
            <Loading size="lg" text="Loading games..." variant="splash" />
          </div>
    );
  }

  return (
    <div className="container-mobile space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-responsive-2xl font-bold text-gradient">
                {t('gameManagement')}
              </h1>
              <p className="text-dark-400">
                {t('manageGames')}
              </p>
            </div>
            <button 
              onClick={handleAddGame}
              className="button-primary flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>{t('addGame')}</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-effect rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-dark-400">{t('totalGames')}</p>
                  <p className="text-2xl font-bold text-gradient">{games.length}</p>
                </div>
                <Gamepad2 size={32} className="text-primary-400" />
              </div>
            </div>
            <div className="glass-effect rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-dark-400">{t('activeGames')}</p>
                  <p className="text-2xl font-bold text-green-400">{activeGamesCount}</p>
                </div>
                <Gamepad2 size={32} className="text-green-400" />
              </div>
            </div>
            <div className="glass-effect rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-dark-400">{t('inactiveGames')}</p>
                  <p className="text-2xl font-bold text-red-400">{inactiveGamesCount}</p>
                </div>
                <Gamepad2 size={32} className="text-red-400" />
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="glass-effect rounded-lg p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter size={20} className="text-dark-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">{t('all')}</option>
                  <option value="active">{t('active')}</option>
                  <option value="inactive">{t('inactive')}</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-primary-500/20 text-primary-400' 
                      : 'bg-dark-800 text-dark-400 hover:text-dark-100'
                  }`}
                >
                  <Grid size={20} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-primary-500/20 text-primary-400' 
                      : 'bg-dark-800 text-dark-400 hover:text-dark-100'
                  }`}
                >
                  <List size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="glass-effect rounded-lg p-4 bg-red-500/20 border border-red-500/30">
              <div className="flex items-center justify-between">
                <p className="text-red-400">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-300"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Games List/Grid */}
          {filteredGames.length === 0 ? (
            <div className="glass-effect rounded-lg p-12 text-center">
              <Gamepad2 size={64} className="mx-auto text-dark-600 mb-4" />
              <p className="text-dark-400 text-lg">{t('noGamesAvailable')}</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' 
              : 'space-y-4'
            }>
              {filteredGames.map((game) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass-effect rounded-lg overflow-hidden ${
                    viewMode === 'grid' ? '' : 'flex'
                  }`}
                >
                  {viewMode === 'grid' ? (
                    <>
                      <div className="relative aspect-video bg-dark-800">
                        <img
                          src={game.thumbnailUrl}
                          alt={game.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-game.jpg';
                          }}
                        />
                        {!game.isActive && (
                          <div className="absolute top-2 right-2 bg-red-500/80 text-white px-2 py-1 rounded text-xs">
                            {t('inactive')}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-lg text-dark-100 mb-2 line-clamp-2">
                          {game.title}
                        </h3>
                        <p className="text-sm text-dark-400 mb-4 line-clamp-2">
                          {game.description}
                        </p>
                        <div className="mb-4">
                          <p className="text-xs text-dark-500 mb-2">Required Packages:</p>
                          <div className="flex flex-wrap gap-2">
                            {(game.requiredPackages || []).map((pkg) => (
                              <span
                                key={pkg}
                                className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-xs font-medium"
                              >
                                {pkg}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditGame(game)}
                            className="flex-1 px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors"
                          >
                            <Edit size={16} className="inline mr-2" />
                            {t('edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteGame(game.id)}
                            disabled={actionLoading === game.id}
                            className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={16} className="inline mr-2" />
                            {t('delete')}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative w-32 h-32 flex-shrink-0 bg-dark-800">
                        <img
                          src={game.thumbnailUrl}
                          alt={game.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-game.jpg';
                          }}
                        />
                      </div>
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-bold text-lg text-dark-100">
                            {game.title}
                          </h3>
                          {!game.isActive && (
                            <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs">
                              {t('inactive')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-dark-400 mb-4">
                          {game.description}
                        </p>
                        <div className="mb-4">
                          <p className="text-xs text-dark-500 mb-2">Required Packages:</p>
                          <div className="flex flex-wrap gap-2">
                            {(game.requiredPackages || []).map((pkg) => (
                              <span
                                key={pkg}
                                className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-xs font-medium"
                              >
                                {pkg}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditGame(game)}
                              className="px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors"
                            >
                              <Edit size={16} className="inline mr-2" />
                              {t('edit')}
                            </button>
                            <button
                              onClick={() => handleDeleteGame(game.id)}
                              disabled={actionLoading === game.id}
                              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            >
                              <Trash2 size={16} className="inline mr-2" />
                              {t('delete')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* Game Form Modal */}
          <GameForm
            isOpen={showForm}
            onClose={() => {
              setShowForm(false);
              setEditingGame(null);
            }}
            onSubmit={handleFormSubmit}
            editData={editingGame}
            loading={formLoading}
          />
        </div>
  );
}

