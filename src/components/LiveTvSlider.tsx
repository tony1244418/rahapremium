'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Radio, Play, Lock } from 'lucide-react';
import { LiveChannel } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { hasAccessToContent } from '@/lib/subscriptions';

interface LiveTvSliderProps {
  channels: LiveChannel[];
  onChannelClick?: (channel: LiveChannel) => void;
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  sport:          'from-blue-700 via-blue-600 to-blue-800',
  news:           'from-slate-700 via-slate-600 to-slate-800',
  entertainment:  'from-indigo-700 via-blue-600 to-blue-800',
  music:          'from-indigo-600 via-purple-600 to-blue-700',
  kids:           'from-sky-600 via-cyan-500 to-blue-600',
  documentary:    'from-slate-600 via-blue-700 to-slate-800',
  movies:         'from-blue-800 via-blue-700 to-slate-700',
  series:         'from-blue-700 via-indigo-600 to-blue-800',
  africa:         'from-amber-700 via-orange-700 to-red-800',
  tanzania:       'from-green-800 via-blue-700 to-blue-900',
  other:          'from-blue-700 via-slate-700 to-blue-900',
};

const getGradient = (cats?: string[]): string => {
  if (!cats || cats.length === 0) return 'from-blue-700 via-slate-700 to-blue-900';
  return CATEGORY_GRADIENTS[cats[0].toLowerCase()] ?? 'from-blue-700 via-slate-700 to-blue-900';
};

export default function LiveTvSlider({ channels, onChannelClick }: LiveTvSliderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = channels.length;

  const goTo = useCallback((index: number, dir: 1 | -1) => {
    setDirection(dir);
    setCurrent(((index % total) + total) % total);
  }, [total]);

  const next = useCallback(() => goTo(current + 1, 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1, -1), [current, goTo]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (total <= 1) return;
    intervalRef.current = setInterval(next, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [total, next]);

  const resetTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (total > 1) intervalRef.current = setInterval(next, 5000);
  };

  const handleNext = () => { next(); resetTimer(); };
  const handlePrev = () => { prev(); resetTimer(); };

  const handleChannelClick = (channel: LiveChannel) => {
    if (!user) {
      router.push(`/auth?redirect=${encodeURIComponent(`/live-tv?channel=${channel.id}`)}`);
      return;
    }
    if (onChannelClick) {
      onChannelClick(channel);
    } else {
      router.push(`/live-tv?channel=${channel.id}`);
    }
  };

  if (total === 0) return null;

  const channel = channels[current];
  const userHasAnyPackage = user?.subscription?.isActive === true;
  const hasAccess = userHasAnyPackage && hasAccessToContent(user, channel.requiredPackages);
  const gradient = getGradient(channel.category as string[]);

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-60%' : '60%', opacity: 0 }),
  };

  return (
    <div className="relative w-full overflow-hidden rounded-3xl shadow-2xl shadow-blue-900/40 border border-white/5" style={{ aspectRatio: '16/7' }}>

      {/* Slides */}
      <AnimatePresence custom={direction} mode="popLayout">
        <motion.div
          key={channel.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'tween', duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0 cursor-pointer"
          onClick={() => handleChannelClick(channel)}
        >
          {/* Background image or gradient */}
          {channel.thumbnailUrl ? (
            <img
              src={channel.thumbnailUrl}
              alt={channel.name}
              className="w-full h-full object-cover"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          ) : null}
          {/* Always overlay gradient on top of image for readability */}
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient} ${channel.thumbnailUrl ? 'opacity-60' : 'opacity-100'}`} />
          {/* Dark vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8">
            {/* LIVE badge */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
              {channel.category && channel.category.length > 0 && (
                <span className="text-xs font-semibold text-white/70 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-full capitalize border border-white/10">
                  {(channel.category as string[])[0]}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-3xl font-black text-white leading-tight mb-4 drop-shadow-lg line-clamp-2">
              {channel.name}
            </h2>

            {/* CTA button */}
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleChannelClick(channel)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold shadow-xl transition-all duration-200 ${
                  hasAccess
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/40'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm'
                }`}
              >
                {hasAccess ? (
                  <><Play size={16} className="fill-white" /> Watch Now</>
                ) : (
                  <><Lock size={15} /> Subscribe</>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Nav buttons */}
      {total > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/40 backdrop-blur-sm hover:bg-black/60 border border-white/10 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/40 backdrop-blur-sm hover:bg-black/60 border border-white/10 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {total > 1 && (
        <div className="absolute bottom-4 right-5 z-20 flex items-center gap-1.5">
          {channels.map((_, i) => (
            <button
              key={i}
              onClick={() => { goTo(i, i > current ? 1 : -1); resetTimer(); }}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
