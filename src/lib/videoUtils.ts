/**
 * Video utility functions for handling different video sources and formats
 */

export interface VideoSource {
  type: 'iframe' | 'youtube' | 'vimeo' | 'direct' | 'other';
  originalUrl: string;
  embedUrl: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
}

/**
 * Convert various video URLs to embeddable formats
 * Now supports any iframe-embeddable URL (mediadelivery.net, Google Drive, YouTube, Vimeo, etc.)
 */
export function convertToEmbedUrl(url: string): VideoSource {
  const trimmedUrl = url.trim();
  
  // Direct video file URLs (should use <video> tag, not iframe)
  if (isDirectVideoUrl(trimmedUrl)) {
    return {
      type: 'direct',
      originalUrl: trimmedUrl,
      embedUrl: trimmedUrl,
      downloadUrl: trimmedUrl
    };
  }
  
  // YouTube URLs - convert to embed format
  if (trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be')) {
    return handleYouTubeUrl(trimmedUrl);
  }
  
  // Vimeo URLs - convert to embed format
  if (trimmedUrl.includes('vimeo.com')) {
    return handleVimeoUrl(trimmedUrl);
  }
  
  // Google Drive URLs (backward compatibility) - convert to preview format
  if (trimmedUrl.includes('drive.google.com') || trimmedUrl.includes('docs.google.com')) {
    return handleGoogleDriveUrl(trimmedUrl);
  }
  
  // mediadelivery.net URLs - try to extract video info for potential download
  if (trimmedUrl.includes('mediadelivery.net') || trimmedUrl.includes('iframe.mediadelivery.net')) {
    return handleMediaDeliveryUrl(trimmedUrl);
  }
  
  // All other URLs - treat as iframe-embeddable
  return {
    type: 'iframe',
    originalUrl: trimmedUrl,
    embedUrl: trimmedUrl
  };
}

/**
 * Handle mediadelivery.net (Bunny.net) URLs
 */
function handleMediaDeliveryUrl(url: string): VideoSource {
  try {
    // Extract library ID and video ID from URL
    // Format: https://iframe.mediadelivery.net/play/LIBRARY_ID/VIDEO_ID
    const match = url.match(/mediadelivery\.net\/play\/(\d+)\/([a-zA-Z0-9-]+)/);
    if (match) {
      const libraryId = match[1];
      const videoId = match[2];
      
      // Try to construct direct video URL (Bunny.net CDN format)
      // Note: This may not always work depending on Bunny.net configuration
      const directVideoUrl = `https://vz-${libraryId}.b-cdn.net/${videoId}/play_720p.mp4`;
      
      return {
        type: 'iframe',
        originalUrl: url,
        embedUrl: url,
        downloadUrl: directVideoUrl // Attempt direct download URL
      };
    }
    
    // If pattern doesn't match, return as-is
    return {
      type: 'iframe',
      originalUrl: url,
      embedUrl: url
    };
  } catch (error) {
    return {
      type: 'iframe',
      originalUrl: url,
      embedUrl: url
    };
  }
}

/**
 * Handle Google Drive URLs (backward compatibility)
 */
function handleGoogleDriveUrl(url: string): VideoSource {
  try {
    let fileId: string | null = null;

    // Extract file ID from various Google Drive URL formats
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9-_]+)/,  // /file/d/FILE_ID
      /[?&]id=([a-zA-Z0-9-_]+)/,      // ?id=FILE_ID or &id=FILE_ID
      /\/d\/([a-zA-Z0-9-_]+)/,        // /d/FILE_ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        fileId = match[1];
        break;
      }
    }

    if (!fileId) {
      throw new Error('Could not extract file ID from Google Drive URL');
    }

    // Use preview URL for embedding
    const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;

    return {
      type: 'iframe',
      originalUrl: url,
      embedUrl: embedUrl,
      downloadUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h300`
    };
  } catch (error) {
    return {
      type: 'iframe',
      originalUrl: url,
      embedUrl: url
    };
  }
}

/**
 * Handle YouTube URLs
 */
function handleYouTubeUrl(url: string): VideoSource {
  try {
    let videoId: string | null = null;
    
    // Extract video ID from various YouTube URL formats
    const patterns = [
      /[?&]v=([a-zA-Z0-9-_]+)/,       // ?v=VIDEO_ID or &v=VIDEO_ID
      /youtu\.be\/([a-zA-Z0-9-_]+)/,  // youtu.be/VIDEO_ID
      /embed\/([a-zA-Z0-9-_]+)/,      // embed/VIDEO_ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        videoId = match[1];
        break;
      }
    }
    
    if (!videoId) {
      throw new Error('Could not extract video ID from YouTube URL');
    }
    
    return {
      type: 'youtube',
      originalUrl: url,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    };
  } catch (error) {
    return {
      type: 'youtube',
      originalUrl: url,
      embedUrl: url
    };
  }
}

/**
 * Handle Vimeo URLs
 */
function handleVimeoUrl(url: string): VideoSource {
  try {
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (!match) {
      throw new Error('Could not extract video ID from Vimeo URL');
    }
    
    const videoId = match[1];
    
    return {
      type: 'vimeo',
      originalUrl: url,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1`,
      thumbnailUrl: `https://vumbnail.com/${videoId}.jpg`
    };
  } catch (error) {
    return {
      type: 'vimeo',
      originalUrl: url,
      embedUrl: url
    };
  }
}

/**
 * Check if URL is a direct video file
 */
function isDirectVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext));
}

/**
 * Generate iframe attributes for different video sources
 */
export function getIframeAttributes(videoSource: VideoSource) {
  const baseAttributes = {
    allowFullScreen: true,
    frameBorder: '0',
    style: { border: 'none', outline: 'none' }
  };
  
  switch (videoSource.type) {
    case 'iframe':
      return {
        ...baseAttributes,
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      };
      
    case 'youtube':
      return {
        ...baseAttributes,
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
      };
      
    case 'vimeo':
      return {
        ...baseAttributes,
        allow: 'autoplay; fullscreen; picture-in-picture'
      };
      
    default:
      return {
        ...baseAttributes,
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      };
  }
}

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract file ID from Google Drive URL (backward compatibility)
 */
export function extractGoogleDriveFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9-_]+)/,
    /[?&]id=([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Generate multiple embed options for Google Drive (backward compatibility)
 */
export function getGoogleDriveEmbedOptions(url: string) {
  const fileId = extractGoogleDriveFileId(url);
  if (!fileId) return null;
  
  return {
    preview: `https://drive.google.com/file/d/${fileId}/preview`,
    embed: `https://drive.google.com/file/d/${fileId}/preview`,
    player: `https://drive.google.com/file/d/${fileId}/preview?usp=sharing`,
    download: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
    thumbnail: `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h300`
  };
}

/**
 * Get video quality options for Google Drive (backward compatibility)
 */
export function getGoogleDriveQualityOptions(fileId: string) {
  return {
    preview: `https://drive.google.com/file/d/${fileId}/preview`,
    embed: `https://drive.google.com/file/d/${fileId}/preview`,
    direct: `https://drive.google.com/uc?export=download&id=${fileId}`,
    view: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`
  };
}
