'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import MainLayout from '@/components/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Play, Clapperboard, MonitorPlay, ChevronLeft, ChevronRight, Gamepad2,
  Star, Sparkles, ArrowRight, Search,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMovies, getSeries, searchContent } from '@/lib/content';
import { getActiveGames } from '@/lib/games';
import { Movie, Series, Game } from '@/types';
import { Loading } from '@/components/ui/Loading';
import { StableThumbnail } from '@/components/StableThumbnail';

// ─── ContentCard ─────────────────────────────────────────────────────────────
// Defined OUTSIDE HomePage so React never recreates it on parent re-render.
// Re-creating a component function inside render = unmount + remount = blink.
function ContentCard({
  item,
  type,
  index,
}: {
  item: Movie | Series | Game;
  type: 'movies' | 'series' | 'games';
  index: number;
}) {
  const isMovie = type === 'movies';
  const isGame = type === 'games';
  const href = isGame ? `/games/${item.id}` : `/${type}/${item.id}`;

  return (
    <div className="flex-shrink-0 w-36 sm:w-40">
      <Link href={href}>
        <div className="relative">
          {/* Thumbnail box — no transitions, no hover transforms */}
          <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-dark-800 mb-2 shadow-md">
            <StableThumbnail
              thumbnailUrl={item.thumbnailUrl}
              alt={item.title}
              className="w-full h-full object-cover"
              loading={index < 6 ? 'eager' : 'lazy'}
              fallbackIcon={
                isGame
                  ? <Gamepad2 size={32} className="text-blue-400" />
                  : isMovie
                    ? <Clapperboard size={32} className="text-blue-400" />
                    : <MonitorPlay size={32} className="text-blue-400" />
              }
            />

            {/* Permanent subtle gradient at bottom for readability */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

            {/* Rating badge */}
            {'rating' in item && item.rating && (
              <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
                <Star size={10} className="fill-blue-400 text-blue-400" />
                <span className="text-xs font-bold text-white">{(item.rating as number).toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-white/90 line-clamp-2 px-0.5">
            {item.title}
          </h3>
        </div>
      </Link>
    </div>
  );
}

// ─── ScrollSection ────────────────────────────────────────────────────────────
// Also moved outside to prevent re-creation on parent renders.
function ScrollSection({
  id,
  title,
  items,
  type,
  seeAllHref,
}: {
  id: string;
  title: React.ReactNode;
  items: (Movie | Series | Game)[];
  type: 'movies' | 'series' | 'games';
  seeAllHref?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    const ref = scrollRef.current;
    if (ref) {
      const saved = sessionStorage.getItem(`scroll-${id}`);
      if (saved) ref.scrollLeft = parseInt(saved, 10);
      checkScroll();
      const handle = () => {
        checkScroll();
        sessionStorage.setItem(`scroll-${id}`, ref.scrollLeft.toString());
      };
      ref.addEventListener('scroll', handle);
      return () => ref.removeEventListener('scroll', handle);
    }
  }, [items, id, checkScroll]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
          {title}
        </h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-xs font-semibold text-blue-400 flex items-center gap-1"
          >
            See All <ArrowRight size={13} />
          </Link>
        )}
      </div>

      <div className="relative">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/3 -translate-y-1/2 z-10 w-7 h-7 bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white shadow-lg border border-white/10"
          >
            <ChevronLeft size={15} />
          </button>
        )}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item, index) => (
            <ContentCard key={item.id} item={item} type={type} index={index} />
          ))}
          <div className="flex-shrink-0 w-1" />
        </div>
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/3 -translate-y-1/2 z-10 w-7 h-7 bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white shadow-lg border border-white/10"
          >
            <ChevronRight size={15} />
          </button>
        )}
      </div>
    </section>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, adminUser, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [contentLoading, setContentLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    movies: Movie[];
    series: Series[];
    games: Game[];
  }>({ movies: [], series: [], games: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const handleSearchEvent = (e: any) => setSearchQuery(e.detail || '');
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q');
    if (initialQuery) setSearchQuery(initialQuery);
    window.addEventListener('app-search', handleSearchEvent);
    return () => window.removeEventListener('app-search', handleSearchEvent);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery.trim());
      } else {
        setSearchResults({ movies: [], series: [], games: [] });
        setHasSearched(false);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await searchContent(query, 'all', user?.isAdult || false);
      setSearchResults({ movies: results.movies, series: results.series, games: [] });
    } catch {
      setSearchResults({ movies: [], series: [], games: [] });
    } finally {
      setIsSearching(false);
    }
  };

  // Hero carousel
  const [heroIndex, setHeroIndex] = useState(0);
  const heroTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && adminUser) router.push('/admin');
  }, [adminUser, loading, router]);

  useEffect(() => {
    const load = async () => {
      try {
        setContentLoading(true);
        const [moviesData, seriesData, gamesResult] = await Promise.all([
          getMovies(false).catch(() => []),
          getSeries(false).catch(() => []),
          getActiveGames().catch(() => ({ success: false, data: [] })),
        ]);
        setMovies(moviesData);
        setSeries(seriesData);
        setGames(gamesResult.success ? gamesResult.data : []);
      } catch {
        setMovies([]); setSeries([]); setGames([]);
      } finally {
        setContentLoading(false);
      }
    };

    if (!loading && !adminUser) {
      load();

      const { supabase } = require('@/lib/supabase');
      const channel = supabase
        .channel('home-admin-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'movies' }, () => { getMovies(false).then(setMovies).catch(() => {}); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'series' }, () => { getSeries(false).then(setSeries).catch(() => {}); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'games' },  () => { getActiveGames().then(r => setGames(r.success ? r.data : [])).catch(() => {}); })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [loading, adminUser]);

  // Memoize so heroItems reference only changes when movies/games data actually changes
  const heroItems = useMemo(() => [
    ...movies.slice(0, 5).map(m => ({ ...m, _type: 'movie' as const })),
    ...games.slice(0, 5).map(g => ({ ...g, _type: 'game' as const })),
  ], [movies, games]);

  // Tanzania Games first, then rest
  const tanzaniaGames = useMemo(() => games.filter(g => g.mode === 'Tanzania Game'), [games]);
  const sortedGames = useMemo(() => [
    ...games.filter(g => g.mode === 'Tanzania Game'),
    ...games.filter(g => g.mode !== 'Tanzania Game'),
  ], [games]);

  const startHeroTimer = useCallback(() => {
    if (heroTimerRef.current) clearInterval(heroTimerRef.current);
    if (heroItems.length > 1) {
      heroTimerRef.current = setInterval(() => {
        setHeroIndex(i => (i + 1) % heroItems.length);
      }, 5500);
    }
  }, [heroItems.length]);

  useEffect(() => {
    startHeroTimer();
    return () => { if (heroTimerRef.current) clearInterval(heroTimerRef.current); };
  }, [startHeroTimer]);

  const goHero = (dir: 'prev' | 'next') => {
    setHeroIndex(i =>
      dir === 'next' ? (i + 1) % heroItems.length : (i - 1 + heroItems.length) % heroItems.length
    );
    startHeroTimer();
  };

  // ── Loading screens ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <MainLayout>
        <div className="container-mobile flex items-center justify-center min-h-96">
          <Loading size="lg" variant="bar" />
        </div>
      </MainLayout>
    );
  }

  if (contentLoading) {
    return (
      <MainLayout>
        <div className="container-mobile pb-24 space-y-6">
          <div className="relative rounded-3xl overflow-hidden mb-6">
            <div className="aspect-[16/9] bg-dark-800 animate-pulse rounded-3xl" />
          </div>
          <div className="space-y-8">
            {['movies', 'series', 'games'].map(type => (
              <section key={type} className="mb-8">
                <div className="h-5 bg-dark-800 rounded-lg w-36 mb-5 animate-pulse" />
                <div className="flex gap-4 overflow-hidden">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex-shrink-0 w-36 md:w-44">
                      <div className="bg-dark-800 rounded-2xl aspect-[2/3] animate-pulse" />
                      <div className="h-3 bg-dark-800 rounded mt-2 w-4/5 animate-pulse" />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (adminUser) return null;

  const heroItem = heroItems[heroIndex] ?? null;

  return (
    <MainLayout>
      <div className="min-h-screen px-3 sm:px-5">

        {searchQuery ? (
          <div className="pt-6 pb-28 min-h-[60vh]">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6">
              Search Results for <span className="text-blue-400">"{searchQuery}"</span>
            </h2>

            {isSearching ? (
              <div className="flex justify-center items-center py-20">
                <Loading size="lg" />
              </div>
            ) : hasSearched && searchResults.movies.length === 0 && searchResults.series.length === 0 ? (
              <div className="text-center py-20 bg-dark-800/30 rounded-3xl border border-white/5">
                <Search size={48} className="mx-auto text-white/20 mb-4" />
                <p className="text-lg font-medium text-white/80">No results found for "{searchQuery}"</p>
                <p className="text-sm text-white/50 mt-2">Try checking for typos or using different keywords.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {searchResults.movies.length > 0 && (
                  <ScrollSection
                    id="search-movies"
                    title={<><Clapperboard size={18} className="text-blue-400" /><span>{t('movies')}</span></>}
                    items={searchResults.movies}
                    type="movies"
                  />
                )}
                {searchResults.series.length > 0 && (
                  <ScrollSection
                    id="search-series"
                    title={<><MonitorPlay size={18} className="text-blue-400" /><span>{t('series')}</span></>}
                    items={searchResults.series}
                    type="series"
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ── Hero Carousel ─────────────────────────────────────────────── */}
            {heroItems.length > 0 && heroItem && (
              <section className="relative mb-8 mt-3 aspect-[16/10] md:aspect-[21/9] rounded-3xl overflow-hidden bg-dark-800 group">
                {heroItems.map((item, index) => {
                  const isActive = index === heroIndex;
                  return (
                    <div
                      key={`${item._type}-${item.id}`}
                      className={`absolute inset-0 transition-opacity duration-700 ease-in-out cursor-pointer ${
                        isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                      }`}
                      onClick={() => isActive && router.push(item._type === 'game' ? `/games/${item.id}` : `/movies/${item.id}`)}
                    >
                      {item.thumbnailUrl ? (
                        <>
                          <img
                            src={item.thumbnailUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110"
                            loading={index === 0 ? 'eager' : 'lazy'}
                          />
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="absolute inset-0 w-full h-full object-contain object-right md:object-right-top lg:object-center py-2 md:py-4 pr-2"
                            style={{ filter: 'brightness(0.95)' }}
                            loading={index === 0 ? 'eager' : 'lazy'}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
                          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/15 to-transparent" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-black" />
                      )}

                      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 z-20">
                        <div className="max-w-2xl">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className="px-3 py-1 bg-blue-600/80 backdrop-blur-sm rounded text-xs font-bold text-white flex items-center gap-1.5 border border-blue-500/30">
                              <Sparkles size={10} />
                              Featured
                            </span>
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded text-xs font-semibold text-white/90 border border-white/10">
                              {item._type === 'game' ? 'Game' : 'Movie'}
                            </span>
                          </div>

                          <h1 className="text-xl md:text-3xl font-bold text-white mb-3 leading-tight">
                            {item.title}
                          </h1>

                          <div className="flex items-center gap-4 mb-6 flex-wrap">
                            {'rating' in item && (item.rating as number) > 0 && (
                              <div className="flex items-center gap-1.5 text-white">
                                <Star size={14} className="fill-blue-400 text-blue-400" />
                                <span className="font-bold text-sm">{(item.rating as number).toFixed(1)}</span>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(item._type === 'game' ? `/games/${item.id}` : `/movies/${item.id}`); }}
                            className="flex items-center gap-2.5 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold text-sm shadow-xl shadow-blue-600/30"
                          >
                            <Play size={18} className="fill-white" />
                            Watch Now
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {heroItems.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); goHero('prev'); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/15 opacity-0 group-hover:opacity-100"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); goHero('next'); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/15 opacity-0 group-hover:opacity-100"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </section>
            )}

            {/* ── Content Sections ──────────────────────────────────────────── */}
            <div className="space-y-1 pb-28">
              {movies.length > 0 && (
                <ScrollSection
                  id="all-movies"
                  title={<><Clapperboard size={18} className="text-blue-400" /><span>{t('movies')}</span></>}
                  items={movies}
                  type="movies"
                  seeAllHref="/movies"
                />
              )}

              {series.length > 0 && (
                <ScrollSection
                  id="all-series"
                  title={<><MonitorPlay size={18} className="text-blue-400" /><span>{t('series')}</span></>}
                  items={series}
                  type="series"
                  seeAllHref="/series"
                />
              )}

              {tanzaniaGames.length > 0 && (
                <ScrollSection
                  id="tanzania-games"
                  title={<><span style={{ fontSize: '1.1em' }}>🇹🇿</span><span style={{ color: '#FFD700', fontWeight: 700 }}>{`Game za Tanzania`}</span></>}
                  items={tanzaniaGames}
                  type="games"
                  seeAllHref="/games"
                />
              )}

              {sortedGames.length > 0 && (
                <ScrollSection
                  id="all-games"
                  title={<><Gamepad2 size={18} className="text-blue-400" /><span>{t('games')}</span></>}
                  items={sortedGames}
                  type="games"
                  seeAllHref="/games"
                />
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
