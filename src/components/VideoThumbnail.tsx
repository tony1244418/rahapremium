'use client';

import React, { useState, useRef, useEffect } from 'react';
import { extractGoogleDriveFileId } from '@/lib/videoUtils';

interface VideoThumbnailProps {
  videoUrl: string;
  thumbnailUrl?: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
}

// Check if URL is a video URL (including M3U8/HLS)
const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('.m3u8') || 
         lowerUrl.includes('.mp4') || 
         lowerUrl.includes('.webm') || 
         lowerUrl.includes('.mov') ||
         lowerUrl.includes('video') ||
         lowerUrl.includes('stream');
};

// Check if URL is an image URL
const isImageUrl = (url: string): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('.jpg') || 
         lowerUrl.includes('.jpeg') || 
         lowerUrl.includes('.png') || 
         lowerUrl.includes('.gif') || 
         lowerUrl.includes('.webp') ||
         lowerUrl.includes('imgur') ||
         lowerUrl.includes('ibb.co');
};

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  videoUrl,
  thumbnailUrl,
  alt,
  className = 'w-full h-full object-cover',
  fallbackIcon
}) => {
  const [imageError, setImageError] = useState(false);
  const [useVideo, setUseVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Determine if thumbnailUrl is actually a video URL or image URL
  const thumbnailIsVideo = thumbnailUrl ? isVideoUrl(thumbnailUrl) : false;
  const thumbnailIsImage = thumbnailUrl ? isImageUrl(thumbnailUrl) : false;

  // Priority: Use image thumbnail if available, otherwise try video
  const actualThumbnailUrl = thumbnailIsImage ? thumbnailUrl : undefined;
  
  // Only use video if no image thumbnail is available
  const shouldUseVideo = !actualThumbnailUrl && !imageError;
  
  // Get video source only if we need to use video
  const actualVideoSrc = shouldUseVideo ? (
    (() => {
      // Get Google Drive file ID and create video URL
      const fileId = extractGoogleDriveFileId(videoUrl);
      const googleDriveVideoSrc = fileId 
        ? `https://drive.google.com/uc?export=download&id=${fileId}`
        : null;
      
      return googleDriveVideoSrc || 
             (videoUrl && isVideoUrl(videoUrl) ? videoUrl : null) ||
             (thumbnailIsVideo ? thumbnailUrl! : null);
    })()
  ) : null;

  // Try to play video when component mounts (only if no image)
  useEffect(() => {
    if (shouldUseVideo && videoRef.current && !videoError && actualVideoSrc) {
      setUseVideo(true);
      const video = videoRef.current;
      
      // Set video source
      video.src = actualVideoSrc;
      
      // Try to play the video
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Video started playing successfully
            setVideoError(false);
          })
          .catch((error) => {
            // Video failed to play
            console.log('Video play failed:', error);
            setVideoError(true);
            setUseVideo(false);
          });
      }
    }
  }, [shouldUseVideo, videoError, actualVideoSrc]);

  // Handle video error
  const handleVideoError = () => {
    setVideoError(true);
    setUseVideo(false);
  };

  // Handle image error
  const handleImageError = () => {
    setImageError(true);
    // If image fails and we have video, try video
    if (actualVideoSrc) {
      setUseVideo(true);
    }
  };

  // Priority 1: Use image thumbnail if available
  if (actualThumbnailUrl && !imageError) {
    return (
      <img
        src={actualThumbnailUrl}
        alt={alt}
        className={className}
        onError={handleImageError}
      />
    );
  }

  // Priority 2: Use video if no image is available and video source exists
  if (shouldUseVideo && useVideo && !videoError && actualVideoSrc) {
    const isHLS = actualVideoSrc.includes('.m3u8');
    
    return (
      <video
        ref={videoRef}
        src={actualVideoSrc}
        className={className}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        onError={handleVideoError}
        onLoadedData={() => {
          // Video loaded successfully
          if (videoRef.current) {
            videoRef.current.play().catch(() => {
              handleVideoError();
            });
          }
        }}
        style={{
          pointerEvents: 'none', // Prevent video controls from showing
        }}
      >
        {isHLS && (
          <source src={actualVideoSrc} type="application/x-mpegURL" />
        )}
      </video>
    );
  }

  // Final fallback - show placeholder
  return (
    <div className={`${className} bg-dark-700 flex items-center justify-center`}>
      {fallbackIcon || (
        <div className="w-12 h-12 bg-dark-600 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-dark-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      )}
    </div>
  );
};

