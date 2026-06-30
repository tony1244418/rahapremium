'use client';

import React from 'react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  variant?: 'splash' | 'ripple' | 'classic' | 'bar';
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  text = 'Loading...',
  className = '',
  variant = 'bar',
}) => {
  const sizeMap = { sm: 'w-6 h-6', md: 'w-10 h-10', lg: 'w-16 h-16' };
  const textMap = { sm: 'text-xs', md: 'text-sm', lg: 'text-sm' };

  // ── BAR variant (new default) ─────────────────────────────────────────────
  // Clean horizontal progress bar with a running blue highlight
  if (variant === 'bar' || variant === 'splash') {
    const barW = size === 'sm' ? 'w-24' : size === 'lg' ? 'w-48' : 'w-36';
    return (
      <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
        {/* Thin spinning ring */}
        <div className={`relative ${sizeMap[size]}`}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: '2px solid rgba(59,130,246,0.12)',
            }}
          />
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              border: '2px solid transparent',
              borderTopColor: '#1e6bef',
              borderRightColor: '#93c5fd',
              animationDuration: '0.9s',
              animationTimingFunction: 'linear',
            }}
          />
        </div>

        {/* Animated bar */}
        <div className={`${barW} h-0.5 rounded-full overflow-hidden bg-white/8 relative`}>
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: '40%',
              background: 'linear-gradient(90deg, transparent, #1e6bef, #82b9ff, #1e6bef, transparent)',
              animation: 'loadingBar 1.4s ease-in-out infinite',
            }}
          />
        </div>

        {text && (
          <p className={`${textMap[size]} text-blue-400/80 font-medium tracking-wide`}>
            {text}
          </p>
        )}
      </div>
    );
  }

  // ── CLASSIC variant ───────────────────────────────────────────────────────
  if (variant === 'classic') {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div className={`relative ${sizeMap[size]}`}>
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              border: '2px solid rgba(59,130,246,0.15)',
              borderTopColor: '#1e6bef',
              animationDuration: '0.8s',
              animationTimingFunction: 'linear',
            }}
          />
        </div>
        {text && <p className={`mt-3 ${textMap[size]} text-blue-400/80 font-medium`}>{text}</p>}
      </div>
    );
  }

  // ── RIPPLE variant ────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`relative ${sizeMap[size]}`}>
        <div className="absolute inset-0 rounded-full border border-blue-500/30 animate-ping" style={{ animationDuration: '1.4s' }} />
        <div className="absolute inset-2 rounded-full border border-blue-400/50 animate-ping" style={{ animationDelay: '0.3s', animationDuration: '1.4s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
        </div>
      </div>
      {text && <p className={`mt-4 ${textMap[size]} text-blue-400/80 font-medium`}>{text}</p>}
    </div>
  );
};
