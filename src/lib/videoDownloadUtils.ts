/**
 * Enhanced Video Download Utilities
 * 
 * This module provides utilities for downloading videos, including support for:
 * - Direct video URLs (.mp4, .webm, etc.)
 * - Blob URLs (using MediaRecorder API)
 * - Embedded videos in iframes
 * - Google Drive videos
 * - MediaDelivery.net videos
 * 
 * Based on techniques from:
 * - https://gist.github.com/coryvirok/40e610f12d0fdd23cc074d7e08e4be80
 */

// Extend HTMLVideoElement to include captureStream method (not in standard TypeScript types)
interface HTMLVideoElementWithCaptureStream extends HTMLVideoElement {
  captureStream?(): MediaStream;
}

/**
 * Downloads a video from a blob URL using MediaRecorder API
 * This is useful for videos that are loaded as blob URLs (common in embedded players)
 */
export async function downloadBlobVideo(
  videoElement: HTMLVideoElement,
  filename: string = 'video.mp4'
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const videoSrc = videoElement.currentSrc || videoElement.src;
      
      if (!videoSrc || !videoSrc.startsWith('blob:')) {
        reject(new Error('Video source is not a blob URL'));
        return;
      }

      // Get MIME type from video element or default to mp4
      const mimeType = videoElement.getAttribute('type') || 'video/mp4';
      const chunks: Blob[] = [];
      
      // Use captureStream to record the video
      const videoWithCapture = videoElement as HTMLVideoElementWithCaptureStream;
      if (!videoWithCapture.captureStream) {
        reject(new Error('captureStream is not supported in this browser'));
        return;
      }
      const stream = videoWithCapture.captureStream();
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        try {
          const blob = new Blob(chunks, { type: mimeType });
          const objectUrl = URL.createObjectURL(blob);

          // Trigger download
          const a = document.createElement('a');
          a.href = objectUrl;
          a.download = filename;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();

          // Clean up
          setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
            document.body.removeChild(a);
            resolve();
          }, 100);
        } catch (error) {
          reject(error);
        }
      };

      recorder.onerror = (event) => {
        reject(new Error('MediaRecorder error occurred'));
      };

      // Start recording
      recorder.start();
      
      // Stop recording after video duration (or timeout after 10 minutes)
      const duration = videoElement.duration || 600; // Default to 10 minutes if unknown
      const timeout = Math.min(duration * 1000, 600000); // Max 10 minutes
      
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, timeout);

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Downloads a video from a regular URL
 */
export async function downloadVideoFromUrl(
  url: string,
  filename: string = 'video.mp4',
  useApi: boolean = true
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      if (useApi) {
        // Use the API endpoint for better handling of various video sources
        const apiUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
        
        console.log('[DOWNLOAD] Making API request to:', apiUrl);
        console.log('[DOWNLOAD] Request URL:', url);
        console.log('[DOWNLOAD] Filename:', filename);
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.error('[DOWNLOAD] Request timeout after 60 seconds');
          controller.abort();
          reject(new Error('Download request timed out. The server may be taking too long to respond. Please try again or check your connection.'));
        }, 60000); // 60 second timeout
        
        let response: Response;
        try {
          response = await fetch(apiUrl, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          console.log('[DOWNLOAD] API response received, status:', response.status);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            console.error('[DOWNLOAD] Request was aborted');
            reject(new Error('Download request timed out. Please check your connection and try again.'));
          } else {
            console.error('[DOWNLOAD] Fetch error:', fetchError);
            reject(new Error(`Network error: ${fetchError.message || 'Failed to connect to server'}`));
          }
          return;
        }
        
        if (!response.ok) {
          let errorData: any = {};
          let errorMessage = `Download failed: HTTP ${response.status}`;
          
          try {
            const text = await response.text();
            console.error('[DOWNLOAD] API error response text:', text);
            try {
              errorData = JSON.parse(text);
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (parseError) {
              // If it's not JSON, use the text as error message
              if (text && text.trim().length > 0) {
                errorMessage = text;
              }
            }
          } catch (textError) {
            console.error('[DOWNLOAD] Failed to read error response:', textError);
          }
          
          console.error('[DOWNLOAD] API error details:', {
            status: response.status,
            statusText: response.statusText,
            errorMessage: errorMessage,
            errorData: errorData
          });
          
          // Handle specific error codes
          if (response.status === 403 || errorData.code === 'CDN_BLOCKED') {
            reject(new Error(`HTTP 403: ${errorMessage}`));
          } else if (response.status === 400) {
            reject(new Error(`HTTP 400: ${errorMessage}`));
          } else {
            reject(new Error(errorMessage));
          }
          return;
        }

        const contentType = response.headers.get('content-type') || '';
        const isVideoContent = contentType.includes('video/') || 
                               contentType.includes('application/octet-stream');

        if (!isVideoContent) {
          const text = await response.text();
          try {
            const errorData = JSON.parse(text);
            reject(new Error(errorData.error || 'Download failed'));
            return;
          } catch {
            reject(new Error('Download failed: Response is not a video file'));
            return;
          }
        }

        console.log('[DOWNLOAD] Response received, reading blob...');
        const blob = await response.blob();
        console.log('[DOWNLOAD] Blob received, size:', blob.size, 'bytes');
        
        if (blob.size < 10000) {
          // Small blob might be an error message
          console.warn('[DOWNLOAD] Blob size is very small, might be an error message');
          const text = await blob.text();
          try {
            const errorData = JSON.parse(text);
            reject(new Error(errorData.error || 'Download failed'));
            return;
          } catch {
            reject(new Error('Download failed: File too small'));
            return;
          }
        }

        console.log('[DOWNLOAD] Creating download link...');
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
          document.body.removeChild(a);
          console.log('[DOWNLOAD] Download completed successfully');
          resolve();
        }, 100);
      } else {
        // Direct download without API
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
          document.body.removeChild(a);
          resolve();
        }, 100);
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Attempts to find and download video from embedded iframe
 * This tries to access video elements within iframes (may fail due to CORS)
 */
export async function downloadVideoFromIframe(
  iframe: HTMLIFrameElement,
  filename: string = 'video.mp4'
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // Try to access iframe content (may fail due to CORS)
      let iframeDocument: Document | null = null;
      try {
        iframeDocument = iframe.contentDocument || iframe.contentWindow?.document || null;
      } catch (e) {
        // CORS restriction - cannot access iframe content
        reject(new Error('Cannot access iframe content due to CORS restrictions. Please use the video URL directly.'));
        return;
      }

      if (!iframeDocument) {
        reject(new Error('Cannot access iframe document'));
        return;
      }

      // Find video element in iframe
      const videoElement = iframeDocument.querySelector('video');
      
      if (!videoElement) {
        reject(new Error('No video element found in iframe'));
        return;
      }

      const videoSrc = videoElement.currentSrc || videoElement.src;

      if (videoSrc.startsWith('blob:')) {
        // Use blob download method
        await downloadBlobVideo(videoElement, filename);
        resolve();
      } else if (videoSrc) {
        // Use URL download method
        await downloadVideoFromUrl(videoSrc, filename, false);
        resolve();
      } else {
        reject(new Error('No video source found'));
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Smart download function that automatically detects the video source type
 * and uses the appropriate download method
 */
export async function downloadVideo(
  source: string | HTMLVideoElement | HTMLIFrameElement,
  filename: string = 'video.mp4',
  options: {
    useApi?: boolean;
    fallbackToDirect?: boolean;
  } = {}
): Promise<void> {
  const { useApi = true, fallbackToDirect = true } = options;

  try {
    // Handle HTMLVideoElement
    if (source instanceof HTMLVideoElement) {
      const videoSrc = source.currentSrc || source.src;
      
      if (videoSrc.startsWith('blob:')) {
        return await downloadBlobVideo(source, filename);
      } else if (videoSrc) {
        return await downloadVideoFromUrl(videoSrc, filename, useApi);
      } else {
        throw new Error('Video element has no source');
      }
    }

    // Handle HTMLIFrameElement
    if (source instanceof HTMLIFrameElement) {
      try {
        return await downloadVideoFromIframe(source, filename);
      } catch (error) {
        // If iframe access fails, try to get the iframe src URL
        if (fallbackToDirect && source.src) {
          console.warn('Iframe access failed, trying direct URL:', error);
          return await downloadVideoFromUrl(source.src, filename, useApi);
        }
        throw error;
      }
    }

    // Handle string URL
    if (typeof source === 'string') {
      if (source.startsWith('blob:')) {
        // For blob URLs, we need a video element
        // Try to find one in the document
        const videoElement = document.querySelector('video');
        if (videoElement && (videoElement.currentSrc || videoElement.src) === source) {
          return await downloadBlobVideo(videoElement, filename);
        } else {
          throw new Error('Blob URL provided but no matching video element found');
        }
      } else {
        return await downloadVideoFromUrl(source, filename, useApi);
      }
    }

    throw new Error('Invalid source type');
  } catch (error) {
    throw error;
  }
}

/**
 * Checks if a URL is downloadable
 */
export function isDownloadableUrl(url: string): boolean {
  if (!url) return false;
  
  const lowerUrl = url.toLowerCase();
  
  // Direct video file URLs are downloadable
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.m3u8'];
  if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
    return true;
  }
  
  // Bunny CDN direct download URLs are downloadable (e.g., https://vz-XXXXX.b-cdn.net/VIDEO_ID/original)
  if (lowerUrl.includes('.b-cdn.net') && (lowerUrl.includes('/original') || lowerUrl.endsWith('/') || !lowerUrl.includes('iframe'))) {
    return true;
  }
  
  // Google Drive URLs can be downloaded
  if (lowerUrl.includes('drive.google.com') || lowerUrl.includes('docs.google.com')) {
    return true;
  }
  
  // mediadelivery.net URLs can be downloaded
  if (lowerUrl.includes('mediadelivery.net')) {
    return true;
  }
  
  // Blob URLs can be downloaded (if we have access to the video element)
  if (lowerUrl.startsWith('blob:')) {
    return true;
  }
  
  // Iframe-only URLs (YouTube, Vimeo, etc.) cannot be directly downloaded
  if (lowerUrl.includes('youtube.com') || 
      lowerUrl.includes('youtu.be') ||
      lowerUrl.includes('vimeo.com')) {
    return false;
  }
  
  // For other URLs, try to download
  return true;
}

/**
 * Gets the best download URL for a given video URL
 * This is useful for services like mediadelivery.net that need URL transformation
 */
export function getBestDownloadUrl(url: string): string | null {
  if (!url) return null;
  
  // mediadelivery.net - construct direct CDN URL
  const mediaDeliveryMatch = url.match(/mediadelivery\.net\/play\/(\d+)\/([a-zA-Z0-9-]+)/);
  if (mediaDeliveryMatch) {
    const libraryId = mediaDeliveryMatch[1];
    const videoId = mediaDeliveryMatch[2];
    // Try 720p first, fallback to other qualities
    return `https://vz-${libraryId}.b-cdn.net/${videoId}/play_720p.mp4`;
  }
  
  // For other URLs, return as-is
  return url;
}

