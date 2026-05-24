'use client';

import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '@/components/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Gamepad2, Search, Filter, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { subscribeToActiveGames } from '@/lib/games';
import { Game, GameCategory, GameMode, GamePlatform } from '@/types';
import Link from 'next/link';
import { Loading } from '@/components/ui/Loading';

const GAME_CATEGORIES: GameCategory[] = ['Action', 'Adventure', 'Puzzle', 'Racing', 'Sports', 'Strategy', 'Arcade', 'Simulation', 'RPG', 'Other'];
const GAME_MODES: GameMode[] = ['Tanzania Game', 'Mod', 'Premium', 'Maleo', 'Maleo Bus Mod', 'Maleo Map Mod', 'ETS2 Bus Mod', 'Original', 'Other'];

export default function GamesPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | 'all'>('all');
  const [selectedMode, setSelectedMode] = useState<GameMode | 'all'>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [showFreeOnly, setShowFreeOnly] = useState(false);

  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = subscribeToActiveGames((gamesData) => {
      setGames(gamesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Group games by category
  const gamesByCategory = useMemo(() => {
    const grouped: Record<string, Game[]> = {};
    games.forEach(game => {
      const category = game.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(game);
    });
    return grouped;
  }, [games]);

  // Group games by platform (no duplication - each game appears only once)
  const gamesByPlatform = useMemo(() => {
    const grouped: Record<string, Game[]> = {
      'Windows': [],
      'Android': [],
      'iOS': [],
      'Mobile': []
    };
    
    games.forEach(game => {
      const platform = game.platform || 'Both';
      // Map platforms to categories - each game goes to ONE primary category
      if (platform === 'Windows') {
        grouped['Windows'].push(game);
      } else if (platform === 'PC') {
        grouped['Windows'].push(game); // PC games go under Windows
      } else if (platform === 'Android') {
        grouped['Android'].push(game); // Android games ONLY in Android section
      } else if (platform === 'iOS') {
        grouped['iOS'].push(game); // iOS games ONLY in iOS section
      } else if (platform === 'Mobile') {
        grouped['Mobile'].push(game); // General Mobile games in Mobile section
      } else if (platform === 'Both') {
        // Cross-platform games go to Mobile section only (or could be Windows)
        grouped['Mobile'].push(game);
      }
    });
    
    // Remove empty platform groups
    Object.keys(grouped).forEach(key => {
      if (grouped[key].length === 0) {
        delete grouped[key];
      }
    });
    
    return grouped;
  }, [games]);

  // Get Tanzania Games (mode === 'Tanzania Game')
  const tanzaniaGames = useMemo(() => {
    return games.filter(game => game.mode === 'Tanzania Game');
  }, [games]);

  // Get all available categories
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    games.forEach(game => {
      if (game.category) {
        cats.add(game.category);
      }
    });
    return Array.from(cats).sort();
  }, [games]);

  // Filter games based on search, category, mode, and free status
  const filteredGames = useMemo(() => {
    let filtered = games;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(game => game.category === selectedCategory);
    }

    // Filter by mode
    if (selectedMode !== 'all') {
      filtered = filtered.filter(game => game.mode === selectedMode);
    }

    // Filter by platform
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(game => {
        const platform = game.platform || 'Both';
        if (selectedPlatform === 'Windows') {
          return platform === 'Windows' || platform === 'PC' || platform === 'Both';
        } else if (selectedPlatform === 'Android') {
          return platform === 'Android' || platform === 'Both';
        } else if (selectedPlatform === 'iOS') {
          return platform === 'iOS' || platform === 'Both';
        } else if (selectedPlatform === 'Mobile') {
          return platform === 'Mobile' || platform === 'Both';
        } else {
          return platform === selectedPlatform;
        }
      });
    }

    // Filter by free status
    if (showFreeOnly) {
      filtered = filtered.filter(game => game.isFree === true);
    }

    // Filter by search query
    if (searchQuery) {
    const query = searchQuery.toLowerCase();
      filtered = filtered.filter(game =>
        game.title.toLowerCase().includes(query) ||
        game.description.toLowerCase().includes(query) ||
        game.category.toLowerCase().includes(query) ||
        (game.mode && game.mode.toLowerCase().includes(query)) ||
        (game.searchKeywords && game.searchKeywords.some(kw => kw.toLowerCase().includes(query))) ||
        (game.genre && game.genre.some(g => g.toLowerCase().includes(query)))
      );
    }

    // Remove duplicates by game ID to prevent same game appearing multiple times
    const uniqueGames = Array.from(
      new Map(filtered.map(game => [game.id, game])).values()
    );
    
    return uniqueGames;
  }, [games, selectedCategory, selectedMode, selectedPlatform, showFreeOnly, searchQuery]);

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="container-mobile flex items-center justify-center min-h-96">
            <Loading size="lg" text={t('loading')} variant="splash" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="container-mobile space-y-6 py-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-responsive-2xl font-bold text-gradient flex items-center justify-center space-x-2">
              <Gamepad2 size={32} />
              <span>{t('games')}</span>
            </h1>
            <p className="text-dark-400">
              {t('games')}
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Filters Row - Dropdowns */}
          {!searchQuery && (
            <div className="glass-effect rounded-lg p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Free Filter Toggle */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="freeFilter"
                    checked={showFreeOnly}
                    onChange={(e) => setShowFreeOnly(e.target.checked)}
                    className="w-4 h-4 text-primary-500 bg-dark-800 border-dark-600 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="freeFilter" className="text-sm font-medium text-dark-200 cursor-pointer">
                    {language === 'sw' ? 'Game Za Free (Bila Malipo)' : t('freeGame')}
                  </label>
                </div>

                {/* Platform Dropdown */}
                <div className="flex-1 relative">
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value as GamePlatform | 'all')}
                    className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none cursor-pointer"
                  >
                    <option value="all">
                      {language === 'sw' ? `Platform Zote (${games.length})` : `${t('all')} Platforms (${games.length})`}
                    </option>
                    {['Windows', 'Android', 'iOS', 'Mobile'].map((platform) => {
                      const count = gamesByPlatform[platform]?.length || 0;
                      if (count === 0) return null;
                      return (
                        <option key={platform} value={platform}>
                          {platform === 'Windows' && '🪟 Windows'}
                          {platform === 'Android' && '🤖 Android'}
                          {platform === 'iOS' && '🍎 iOS'}
                          {platform === 'Mobile' && '📱 Mobile'}
                          {' '}({count})
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-400 pointer-events-none" />
                </div>

                {/* Mode Dropdown */}
                <div className="flex-1 relative">
                  <select
                    value={selectedMode}
                    onChange={(e) => setSelectedMode(e.target.value as GameMode | 'all')}
                    className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none cursor-pointer"
                  >
                    <option value="all">
                      {language === 'sw' ? `Mod Zote (${games.length})` : `${t('all')} Modes (${games.length})`}
                    </option>
                    {GAME_MODES.map((mode) => {
                      const count = games.filter(g => g.mode === mode).length;
                      if (count === 0) return null;
                      return (
                        <option key={mode} value={mode}>
                          {t(mode.toLowerCase())} ({count})
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-400 pointer-events-none" />
                </div>

                {/* Category Dropdown */}
                <div className="flex-1 relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as GameCategory | 'all')}
                    className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none cursor-pointer"
                  >
                    <option value="all">
                      {language === 'sw' ? `Category Zote (${games.length})` : `${t('all')} Categories (${games.length})`}
                    </option>
                    {GAME_CATEGORIES.map((category) => {
                      const count = games.filter(g => g.category === category).length;
                      if (count === 0) return null;
                      return (
                        <option key={category} value={category}>
                          {category} ({count})
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-400 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* Category Header (when category is selected) */}
          {!searchQuery && selectedCategory !== 'all' && (
            <div className="glass-effect rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-dark-100 flex items-center space-x-2">
                    <Gamepad2 size={24} className="text-primary-400" />
                    <span>{selectedCategory} Games</span>
                    <span className="text-sm font-normal text-dark-400">
                      ({filteredGames.length})
                    </span>
                  </h2>
                  <p className="text-sm text-dark-400 mt-1">
                    All {selectedCategory.toLowerCase()} games available
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="text-sm text-primary-400 hover:text-primary-300"
                >
                  ← {t('back')} {t('all')}
                </button>
              </div>
            </div>
          )}

          {/* Games by Platform (when no search and all selected) */}
          {!searchQuery && selectedCategory === 'all' && selectedMode === 'all' && selectedPlatform === 'all' && !showFreeOnly ? (
            <div className="space-y-8">

              {/* 🇹🇿 Tanzania Games Featured Section */}
              {tanzaniaGames.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center space-x-2" style={{ color: '#FFD700' }}>
                      <span>🇹🇿</span>
                      <span>{language === 'sw' ? 'Game za Tanzania' : 'Tanzania Games'}</span>
                      <span className="text-sm font-normal text-dark-400">({tanzaniaGames.length})</span>
                    </h2>
                    <button
                      onClick={() => setSelectedMode('Tanzania Game')}
                      className="text-sm hover:opacity-80"
                      style={{ color: '#FFD700' }}
                    >
                      {language === 'sw' ? 'Tazama Zote →' : 'View All →'}
                    </button>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(0,100,0,0.18) 0%, rgba(255,215,0,0.08) 100%)', border: '1px solid rgba(255,215,0,0.25)' }}>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {tanzaniaGames.slice(0, 6).map((game, index) => (
                        <motion.div
                          key={game.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Link href={`/games/${game.id}`}>
                            <div className="glass-effect rounded-lg overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                              <div className="relative aspect-[2/3] bg-dark-800">
                                <img
                                  src={game.thumbnailUrl}
                                  alt={game.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder-game.jpg';
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                {/* Free Badge */}
                                {game.isFree && (
                                  <div className="absolute top-2 left-2 z-10">
                                    <span className="px-2 py-1 rounded-lg text-xs font-bold bg-green-500/90 text-white backdrop-blur-sm shadow-lg">
                                      {t('free')}
                                    </span>
                                  </div>
                                )}
                                {/* Tanzania Badge */}
                                <div className="absolute top-2 right-2 z-10">
                                  <span className="px-2 py-1 rounded-lg text-xs font-bold backdrop-blur-sm shadow-lg" style={{ background: 'rgba(0,100,0,0.85)', color: '#FFD700' }}>
                                    🇹🇿 Bongo Game
                                  </span>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4">
                                  <h3 className="font-bold text-lg text-white mb-1 line-clamp-2">
                                    {game.title}
                                  </h3>
                                  <p className="text-sm text-white/90 line-clamp-2">
                                    {game.description}
                                  </p>
                                </div>
                              </div>
                              <div className="p-3">
                                {!game.isFree && game.requiredPackages.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {game.requiredPackages.slice(0, 2).map((pkg) => (
                                      <span key={pkg} className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-xs font-medium">
                                        {pkg}
                                      </span>
                                    ))}
                                    {game.requiredPackages.length > 2 && (
                                      <span className="px-2 py-1 bg-dark-700 text-dark-400 rounded text-xs">
                                        +{game.requiredPackages.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                    {tanzaniaGames.length > 6 && (
                      <div className="text-center mt-4">
                        <button
                          onClick={() => setSelectedMode('Tanzania Game')}
                          className="text-sm font-medium hover:opacity-80"
                          style={{ color: '#FFD700' }}
                        >
                          {language === 'sw' ? `Tazama Game Zote ${tanzaniaGames.length} za Tanzania →` : `View All ${tanzaniaGames.length} Tanzania Games →`}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {['Windows', 'Android', 'iOS', 'Mobile'].map((platform) => {
                const platformGames = gamesByPlatform[platform] || [];
                if (platformGames.length === 0) return null;

                return (
                  <motion.div
                    key={platform}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-dark-100 flex items-center space-x-2">
                        <Gamepad2 size={24} className="text-primary-400" />
                        <span>
                          {platform === 'Windows' && '🪟 Windows Games'}
                          {platform === 'Android' && '🤖 Android Games'}
                          {platform === 'iOS' && '🍎 iOS Games'}
                          {platform === 'Mobile' && '📱 Mobile Games'}
                          {platform === 'PC' && '🖥️ PC Games'}
                          {platform === 'Both' && '🖥️📱 Cross-Platform Games'}
                        </span>
                        <span className="text-sm font-normal text-dark-400">
                          ({platformGames.length})
                        </span>
                      </h2>
                      <button
                        onClick={() => setSelectedPlatform(platform as GamePlatform)}
                        className="text-sm text-primary-400 hover:text-primary-300"
                      >
                        View All →
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {platformGames.slice(0, 6).map((game, index) => (
                        <motion.div
                          key={game.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Link href={`/games/${game.id}`}>
                            <div className="glass-effect rounded-lg overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                              <div className="relative aspect-[2/3] bg-dark-800">
                                <img
                                  src={game.thumbnailUrl}
                                  alt={game.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder-game.jpg';
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                {/* Free Badge */}
                                {game.isFree && (
                                  <div className="absolute top-2 left-2 z-10">
                                    <span className="px-2 py-1 rounded-lg text-xs font-bold bg-green-500/90 text-white backdrop-blur-sm shadow-lg">
                                      {t('free')}
                                    </span>
                                  </div>
                                )}
                                {/* Platform Badge on Thumbnail */}
                                {game.platform && (
                                  <div className="absolute top-2 right-2">
                                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                                      game.platform === 'PC' || game.platform === 'Windows'
                                        ? 'bg-blue-500/90 text-white'
                                        : game.platform === 'Mobile' || game.platform === 'Android' || game.platform === 'iOS'
                                        ? 'bg-green-500/90 text-white'
                                        : 'bg-orange-500/90 text-white'
                                    }`}>
                                      {game.platform === 'PC' && '🖥️ PC'}
                                      {game.platform === 'Windows' && '🪟 Windows'}
                                      {game.platform === 'Mobile' && '📱 Mobile'}
                                      {game.platform === 'Android' && '🤖 Android'}
                                      {game.platform === 'iOS' && '🍎 iOS'}
                                      {game.platform === 'Both' && '🖥️📱 Both'}
                                    </span>
                                  </div>
                                )}
                                {/* Mode Badge */}
                                {game.mode && (
                                  <div className="absolute bottom-2 left-2 z-10">
                                    <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-purple-500/80 text-white backdrop-blur-sm">
                                      {t(game.mode.toLowerCase())}
                                    </span>
                                  </div>
                                )}
                                <div className="absolute bottom-4 left-4 right-4">
                                  <h3 className="font-bold text-lg text-white mb-1 line-clamp-2">
                                    {game.title}
                                  </h3>
                                  <p className="text-sm text-white/90 line-clamp-2">
                                    {game.description}
                                  </p>
                                </div>
                              </div>
                              <div className="p-4">
                                {/* Game Category - Hide when any filter is active (redundant) */}
                                {game.category && selectedCategory === 'all' && selectedMode === 'all' && selectedPlatform === 'all' && !showFreeOnly && (
                                  <div className="mb-3">
                                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                                      {game.category}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Required Packages */}
                                {!game.isFree && (
                                  <div className="flex flex-wrap gap-2">
                                    {game.requiredPackages.slice(0, 2).map((pkg) => (
                                      <span
                                        key={pkg}
                                        className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-xs font-medium"
                                      >
                                        {pkg}
                                      </span>
                                    ))}
                                    {game.requiredPackages.length > 2 && (
                                      <span className="px-2 py-1 bg-dark-700 text-dark-400 rounded text-xs">
                                        +{game.requiredPackages.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                    {platformGames.length > 6 && (
                      <div className="text-center">
                        <button
                          onClick={() => setSelectedPlatform(platform as GamePlatform)}
                          className="text-primary-400 hover:text-primary-300 text-sm font-medium"
                        >
                          View All {platformGames.length} {platform} Games →
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="glass-effect rounded-lg p-12 text-center">
              <Gamepad2 size={64} className="mx-auto text-dark-600 mb-4" />
              <p className="text-dark-400 text-lg">
                {searchQuery ? t('noResultsFound') : t('noGamesAvailable')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredGames.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={`/games/${game.id}`}>
                    <div className="glass-effect rounded-lg overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                      <div className="relative aspect-[2/3] bg-dark-800">
                        <img
                          src={game.thumbnailUrl}
                          alt={game.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-game.jpg';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        {/* Free Badge */}
                        {game.isFree && (
                          <div className="absolute top-2 left-2 z-10">
                            <span className="px-2 py-1 rounded-lg text-xs font-bold bg-green-500/90 text-white backdrop-blur-sm shadow-lg">
                              {t('free')}
                            </span>
                          </div>
                        )}
                        {/* Platform Badge on Thumbnail */}
                        {game.platform && (
                          <div className="absolute top-2 right-2 z-10">
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                              game.platform === 'PC' || game.platform === 'Windows'
                                ? 'bg-blue-500/90 text-white'
                                : game.platform === 'Mobile' || game.platform === 'Android' || game.platform === 'iOS'
                                ? 'bg-green-500/90 text-white'
                                : 'bg-orange-500/90 text-white'
                            }`}>
                              {game.platform === 'PC' && '🖥️ PC'}
                              {game.platform === 'Windows' && '🪟 Windows'}
                              {game.platform === 'Mobile' && '📱 Mobile'}
                              {game.platform === 'Android' && '🤖 Android'}
                              {game.platform === 'iOS' && '🍎 iOS'}
                              {game.platform === 'Both' && '🖥️📱 Both'}
                            </span>
                          </div>
                        )}
                        {/* Mode Badge */}
                        {game.mode && (
                          <div className="absolute bottom-2 left-2 z-10">
                            <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-purple-500/80 text-white backdrop-blur-sm">
                              {t(game.mode.toLowerCase())}
                            </span>
                          </div>
                        )}
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="font-bold text-lg text-white mb-1 line-clamp-2">
                            {game.title}
                          </h3>
                          <p className="text-sm text-white/90 line-clamp-2">
                            {game.description}
                          </p>
                        </div>
                      </div>
                      <div className="p-4">
                        {/* Game Category - Hide when any filter is active (redundant) */}
                        {game.category && selectedCategory === 'all' && selectedMode === 'all' && selectedPlatform === 'all' && !showFreeOnly && (
                          <div className="mb-3">
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                              {game.category}
                            </span>
                          </div>
                        )}
                        
                        {/* Required Packages */}
                        {!game.isFree && (
                        <div className="flex flex-wrap gap-2">
                          {game.requiredPackages.slice(0, 2).map((pkg) => (
                            <span
                              key={pkg}
                              className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-xs font-medium"
                            >
                              {pkg}
                            </span>
                          ))}
                          {game.requiredPackages.length > 2 && (
                            <span className="px-2 py-1 bg-dark-700 text-dark-400 rounded text-xs">
                              +{game.requiredPackages.length - 2}
                            </span>
                          )}
                        </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

