'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlatformControls } from '@/contexts/PlatformControlContext';
import {
  Play, Lock, Star, Eye, Search, TrendingUp, Video, X, Film,
  MessageCircle, Instagram, Twitter, Facebook, Youtube, Send,
} from 'lucide-react';
import { subscribeToAdultMovies } from '@/lib/content-management';
import { Movie } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Loading } from '@/components/ui/Loading';
import { hasPurchasedContent } from '@/lib/subscriptions';
import { useRouter } from 'next/navigation';
import { getControlCenterSettings, ControlCenterSettings } from '@/lib/admin-settings';

type AdultSection = 'ngono' | 'movies-ngono';

export default function AdultContentPage() {
  const { user, refreshUserData } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const { toggles, loading: togglesLoading } = usePlatformControls();
  const [loading, setLoading] = useState(true);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [activeSection, setActiveSection] = useState<AdultSection>('ngono');
  const [socialSettings, setSocialSettings] = useState<ControlCenterSettings | null>(null);

  // Redirect to home if the adult section is disabled by admin
  useEffect(() => {
    if (!togglesLoading && !toggles.adultSectionEnabled) {
      router.replace('/');
    }
  }, [toggles.adultSectionEnabled, togglesLoading, router]);

  useEffect(() => {
    getControlCenterSettings().then(setSocialSettings).catch(console.error);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAdultMovies((data) => {
      setMovies(data);
      setLoading(false);
    });
    const timeout = setTimeout(() => setLoading(false), 5000);
    // Refresh user on mount to get latest content_accesses after a payment redirect
    refreshUserData();
    return () => { unsubscribe(); clearTimeout(timeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getZilizovuja   = () => movies.filter(m => m.adultCategory === 'zilizovuja');
  const getNgono        = () => movies.filter(m => m.adultCategory === 'ngono' || (m.isAdult && !m.adultCategory));
  const getMoviesZaNgono = () => movies.filter(m => m.adultCategory === 'movies-ngono');

  const applyFilters = (content: Movie[]) => {
    let filtered = [...content];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        (item.title || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (Array.isArray(item.genre) && item.genre.some(g => g.toLowerCase().includes(q))) ||
        (Array.isArray(item.searchKeywords) && item.searchKeywords.some(k => k.toLowerCase().includes(q))) ||
        (item.director || '').toLowerCase().includes(q)
      );
    }
    if (genreFilter !== 'all') {
      filtered = filtered.filter(item =>
        Array.isArray(item.genre) && item.genre.some(g => g.toLowerCase() === genreFilter.toLowerCase())
      );
    }
    return filtered;
  };

  const getCurrentContent = () => {
    if (activeSection === 'ngono')         return applyFilters(getNgono());
    if (activeSection === 'movies-ngono')  return applyFilters(getMoviesZaNgono());
    return [];
  };

  const getAllGenres = (): string[] => {
    let base: Movie[] = [];
    if (activeSection === 'ngono')   base = getNgono();
    else if (activeSection === 'movies-ngono') base = getMoviesZaNgono();
    return Array.from(new Set(base.flatMap(m => m.genre || [])));
  };

  const handleContentClick = (item: Movie) => {
    const alreadyPurchased = hasPurchasedContent(user, item.id);

    if (!user) {
      // Not logged in — send to auth, then to pay page
      router.push(`/auth?redirect=${encodeURIComponent(`/pay?contentId=${item.id}&type=adult`)}`);
      return;
    }
    // Already purchased → watch directly
    if (alreadyPurchased) {
      router.push(`/adult/watch/${item.id}`);
      return;
    }
    // Not purchased → always go to pay page (per-content purchase model)
    router.push(`/pay?contentId=${item.id}&type=adult`);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container-mobile flex items-center justify-center min-h-96">
          <Loading size="lg" text="Loading content..." variant="bar" />
        </div>
      </MainLayout>
    );
  }

  // If the section is disabled, render nothing (redirect is handled in useEffect above)
  if (!togglesLoading && !toggles.adultSectionEnabled) {
    return null;
  }

  const tabs = [
    { key: 'ngono'        as AdultSection, label: 'Video Clips', icon: Video,       count: getNgono().length },
    { key: 'movies-ngono' as AdultSection, label: 'Movies',      icon: Film,        count: getMoviesZaNgono().length },
  ];

  const currentContent = getCurrentContent();
  const genres = getAllGenres();

  return (
    <MainLayout>
      <div className="container-mobile space-y-5 pb-20">

        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-700/30">
            <span className="text-white font-black text-sm">18+</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{t('adultContent')}</h1>
            <p className="text-xs text-gray-500">Adults only — 18 years and above</p>
          </div>
        </div>

        {/* Social Links Strip */}
        {socialSettings && (socialSettings.socialWhatsapp || socialSettings.socialInstagram || socialSettings.socialTwitter || socialSettings.socialFacebook || socialSettings.socialTelegram || socialSettings.socialYoutube) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500 font-semibold mr-1">Follow Us:</span>
            {socialSettings.socialWhatsapp && (
              <a href={socialSettings.socialWhatsapp} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/20 hover:text-green-300 transition-all duration-200"
                title="WhatsApp">
                <MessageCircle size={15} />
              </a>
            )}
            {socialSettings.socialInstagram && (
              <a href={socialSettings.socialInstagram} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 hover:bg-primary-500/20 hover:text-primary-300 transition-all duration-200"
                title="Instagram">
                <Instagram size={15} />
              </a>
            )}
            {socialSettings.socialTwitter && (
              <a href={socialSettings.socialTwitter} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center text-blue-400 hover:bg-blue-400/20 hover:text-blue-300 transition-all duration-200"
                title="Twitter / X">
                <Twitter size={15} />
              </a>
            )}
            {socialSettings.socialFacebook && (
              <a href={socialSettings.socialFacebook} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-500 hover:bg-blue-600/20 hover:text-blue-400 transition-all duration-200"
                title="Facebook">
                <Facebook size={15} />
              </a>
            )}
            {socialSettings.socialTelegram && (
              <a href={socialSettings.socialTelegram} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center text-sky-400 hover:bg-sky-400/20 hover:text-sky-300 transition-all duration-200"
                title="Telegram">
                <Send size={15} />
              </a>
            )}
            {socialSettings.socialYoutube && (
              <a href={socialSettings.socialYoutube} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-500 hover:bg-red-600/20 hover:text-red-400 transition-all duration-200"
                title="YouTube">
                <Youtube size={15} />
              </a>
            )}
          </div>
        )}


        <div className="grid grid-cols-2 gap-2 bg-dark-900/80 p-1.5 rounded-2xl border border-dark-700/50">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => { setActiveSection(key); setSearchQuery(''); setGenreFilter('all'); }}
              className={`relative flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl transition-all duration-250 ${
                activeSection === key
                  ? 'bg-blue-700 text-white shadow-lg shadow-blue-700/30'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon size={17} />
              <span className="font-bold text-xs text-center leading-tight">{label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                activeSection === key ? 'bg-black/25 text-white' : 'bg-dark-700 text-gray-500'
              }`}>{count}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={17} />
          <input
            type="text"
            placeholder={`Search ${activeSection === 'ngono' ? 'Video Clips' : 'Movies'}...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-dark-800/80 backdrop-blur-sm border border-dark-700/60 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Genre filter */}
        {genres.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {['all', ...genres].map(genre => (
              <button
                key={genre}
                onClick={() => setGenreFilter(genre)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  genreFilter === genre
                    ? 'bg-blue-700 text-white shadow-md shadow-blue-700/30'
                    : 'bg-dark-800/80 text-gray-400 hover:text-white border border-dark-700/60'
                }`}
              >
                {genre === 'all' ? 'All Genres' : genre}
              </button>
            ))}
          </div>
        )}

        {/* Content grid */}
        <AnimatePresence mode="wait">
          {currentContent.length > 0 ? (
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.28 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4"
            >
              {currentContent.map((item, index) => {
                const hasPurchased = hasPurchasedContent(user, item.id);
                // Adult content: always locked unless purchased
                const hasAccess = hasPurchased;
                const locked = !hasAccess;
                const title = item.title || 'Untitled';

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.93 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.28, delay: index * 0.03 }}
                    className="group cursor-pointer"
                    onClick={() => handleContentClick(item)}
                  >
                    {/* Thumbnail */}
                    <div className="relative overflow-hidden rounded-2xl bg-dark-800 aspect-[3/4] mb-2.5 shadow-md group-hover:shadow-xl group-hover:shadow-blue-900/30 transition-all duration-300 transform group-hover:scale-[1.03] group-hover:-translate-y-1">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-800/40 to-slate-900">
                          <Play size={28} className="text-blue-400" />
                        </div>
                      )}

                      {/* Always-on dark gradient from bottom for readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {/* 18+ badge */}
                      <div className="absolute top-2 left-2 bg-blue-700/90 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded font-black shadow-md">
                        18+
                      </div>

                      {/* Lock badge at bottom — visible over the image */}
                      {locked && (
                        <div className="absolute bottom-0 left-0 right-0 px-3 py-3 flex flex-col items-center gap-1">
                          <div className="w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 shadow-lg">
                            <Lock size={14} className="text-white" />
                          </div>
                          {item.contentPrice && item.contentPrice > 0 && (
                            <span className="text-xs text-amber-400 font-black drop-shadow-lg">
                              TZS {item.contentPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Play button on hover — only for purchased content */}
                      {hasAccess && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-600/50 ring-2 ring-white/15 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                            <Play size={20} className="text-white fill-white ml-0.5" />
                          </div>
                        </div>
                      )}

                      {/* Duration badge — only for purchased */}
                      {hasAccess && (item.duration ?? 0) > 0 && (
                        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded">
                          {Math.floor((item.duration ?? 0) / 60)}h {(item.duration ?? 0) % 60}m
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div>
                      <h3 className="font-bold text-sm text-white line-clamp-2 mb-1 group-hover:text-blue-400 transition-colors">
                        {title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {item.rating != null && (
                          <>
                            <Star size={11} className="text-blue-400 fill-blue-400" />
                            <span>{item.rating}/5</span>
                          </>
                        )}
                        {item.views != null && (
                          <>
                            <Eye size={11} className="ml-0.5" />
                            <span>{(item.views as number).toLocaleString()}</span>
                          </>
                        )}
                      </div>
                      {locked && (
                        <p className="mt-1 text-xs text-amber-400 font-semibold">Bonyeza Kulipa</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 bg-dark-800/40 rounded-3xl border border-dark-700/50"
            >
              <div className="w-16 h-16 bg-dark-700/80 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-gray-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-300 mb-2">No Content Found</h3>
              <p className="text-gray-500 text-sm">
                {searchQuery || genreFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : `No ${activeSection} content available at this time`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
}
