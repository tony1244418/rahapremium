'use client';

import React from 'react';

interface StableThumbnailProps {
  thumbnailUrl?: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  loading?: 'eager' | 'lazy';
}

/**
 * StableThumbnail — completely static, zero animations, zero state changes.
 * Shows the image if URL is provided, otherwise shows fallback icon.
 * No opacity transitions, no mount/unmount, no re-renders.
 */
export const StableThumbnail: React.FC<StableThumbnailProps> = ({
  thumbnailUrl,
  alt,
  className = 'w-full h-full object-cover',
  fallbackIcon,
  loading = 'lazy',
}) => {
  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt={alt}
        className={className}
        loading={loading}
        decoding="async"
        style={{ display: 'block' }}
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-dark-800">
      {fallbackIcon ?? (
        <div className="w-10 h-10 bg-dark-700 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-dark-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      )}
    </div>
  );
};
