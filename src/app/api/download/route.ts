import { NextRequest, NextResponse } from 'next/server';

// Function to extract direct download URL from Google Drive
async function getGoogleDriveDirectUrl(fileId: string): Promise<string | null> {
  try {
    // First, try to get the file info to check if it's publicly accessible
    const infoUrl = `https://drive.google.com/file/d/${fileId}/view`;
    const infoResponse = await fetch(infoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    if (!infoResponse.ok) {
      return null;
    }

    const html = await infoResponse.text();
    
    // Look for the direct download URL in the HTML
    const directUrlMatch = html.match(/https:\/\/drive\.google\.com\/uc\?id=[^"'\s]+/);
    if (directUrlMatch) {
      return directUrlMatch[0];
    }

    // Try alternative patterns
    const altUrlMatch = html.match(/https:\/\/[^"'\s]*drive\.google\.com[^"'\s]*uc[^"'\s]*id=[^"'\s]+/);
    if (altUrlMatch) {
      return altUrlMatch[0];
    }

    // If no direct URL found, construct the standard download URL
    return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
  } catch (error) {
    console.error('Error getting Google Drive direct URL:', error);
    return null;
  }
}

// Function to check if response is actually a video file
function isVideoResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type') || '';
  const contentLength = response.headers.get('content-length');
  
  // Check if it's a video content type
  if (contentType.includes('video/')) {
    return true;
  }
  
  // Check if it's HTML (which means it's not a direct video)
  if (contentType.includes('text/html')) {
    return false;
  }
  
  // Check content length - if it's very small, it's probably not a video
  if (contentLength && parseInt(contentLength) < 10000) {
    return false;
  }
  
  return true;
}

// Check if URL is a direct video file URL
function isDirectVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.m3u8'];
  const lowerUrl = url.toLowerCase();
  
  // Check for video file extensions
  if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
    return true;
  }
  
  // Check for Bunny CDN direct download URLs (e.g., https://vz-XXXXX.b-cdn.net/VIDEO_ID/original)
  if (lowerUrl.includes('.b-cdn.net') && (lowerUrl.includes('/original') || lowerUrl.endsWith('/') || !lowerUrl.includes('iframe'))) {
    return true;
  }
  
  return false;
}

// Extract Google Drive file ID from URL
function extractGoogleDriveFileId(url: string): string | null {
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

export async function GET(request: NextRequest) {
  try {
    console.log('[API DEBUG] Download request received at:', new Date().toISOString());
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('url');
    const filename = searchParams.get('filename') || 'video.mp4';
    
    console.log('[API DEBUG] Raw videoUrl param:', videoUrl);
    console.log('[API DEBUG] Filename:', filename);
    
    if (!videoUrl) {
      console.error('[API DEBUG] No videoUrl provided in request');
      return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
    }

    // Decode the URL
    const decodedUrl = decodeURIComponent(videoUrl);
    console.log('[API DEBUG] Decoded URL:', decodedUrl);
    console.log('[API DEBUG] Is Bunny CDN URL:', decodedUrl.toLowerCase().includes('.b-cdn.net'));
    
    // Handle different types of URLs
    
    // 1. Direct video file URLs (.mp4, .webm, etc.) - download directly
    if (isDirectVideoUrl(decodedUrl)) {
      console.log(`[API DEBUG] Attempting direct download from: ${decodedUrl}`);
      
      const isBunnyCdnUrl = decodedUrl.toLowerCase().includes('.b-cdn.net');
      
      const response = await fetch(decodedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Referer': new URL(decodedUrl).origin,
        },
        redirect: 'follow'
      });

      console.log(`[API DEBUG] Response status: ${response.status}`);
      console.log(`[API DEBUG] Response headers:`, {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length'),
        'content-disposition': response.headers.get('content-disposition')
      });

      if (!response.ok) {
        console.error(`[API DEBUG] Fetch failed with status ${response.status}`);
        return NextResponse.json({ 
          error: `Download failed: HTTP ${response.status}`,
          fallbackUrl: decodedUrl
        }, { status: response.status });
      }

      // For Bunny CDN URLs, be more lenient with content-type checking
      // Bunny CDN might return different content-types or streaming responses
      if (!isBunnyCdnUrl && !isVideoResponse(response)) {
        console.error(`[API DEBUG] Response is not recognized as video. Content-Type: ${response.headers.get('content-type')}`);
        return NextResponse.json({ 
          error: 'URL does not point to a video file',
          fallbackUrl: decodedUrl
        }, { status: 400 });
      }
    
      const contentType = response.headers.get('content-type') || 'video/mp4';
      console.log(`[API DEBUG] Direct download successful! Content-Type: ${contentType}`);
      
      const headers = new Headers();
      headers.set('Content-Type', contentType);
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Range');
      
      if (response.headers.get('content-length')) {
        headers.set('Content-Length', response.headers.get('content-length')!);
      }
      
      // For streaming responses (like Bunny CDN), we might need to handle differently
      return new NextResponse(response.body, {
        status: response.status,
        headers
      });
    }
    
    // 2. Google Drive URLs - use existing logic
    const fileId = extractGoogleDriveFileId(decodedUrl);
    if (fileId) {
      console.log(`Attempting Google Drive download for file ID: ${fileId}`);
      
    const directUrl = await getGoogleDriveDirectUrl(fileId);
    if (!directUrl) {
      return NextResponse.json({ 
        error: 'Unable to get direct download URL',
        fallbackUrl: `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`
      }, { status: 400 });
    }

    console.log(`Attempting download with URL: ${directUrl}`);
    
    const response = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Referer': 'https://drive.google.com/',
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      return NextResponse.json({ 
        error: `Download failed: HTTP ${response.status}`,
        fallbackUrl: `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`
      }, { status: response.status });
    }

    if (!isVideoResponse(response)) {
      return NextResponse.json({ 
        error: 'Download returned non-video content. The file may not be publicly accessible.',
        fallbackUrl: `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
        suggestions: [
          'Make sure the Google Drive file is set to "Anyone with the link can view"',
          'Try downloading directly from Google Drive',
          'The file might be too large for direct download'
        ]
      }, { status: 400 });
    }

    console.log(`Download successful! Content-Type: ${response.headers.get('content-type')}`);
    
    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('content-type') || 'video/mp4');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range');
    
    if (response.headers.get('content-length')) {
      headers.set('Content-Length', response.headers.get('content-length')!);
    }
    
    return new NextResponse(response.body, {
      status: response.status,
      headers
    });
    }
    
    // 3. mediadelivery.net URLs - try to extract and download direct video URL
    if (decodedUrl.includes('mediadelivery.net')) {
      console.log(`[API DEBUG] Attempting mediadelivery.net download: ${decodedUrl}`);
      
      // Extract library ID and video ID
      const match = decodedUrl.match(/mediadelivery\.net\/play\/(\d+)\/([a-zA-Z0-9-]+)/);
      if (match) {
        const libraryId = match[1];
        const videoId = match[2];
        console.log(`[API DEBUG] Extracted libraryId: ${libraryId}, videoId: ${videoId}`);
        
        // First, try to fetch the iframe page to extract the actual video source
        let extractedVideoUrl: string | null = null;
        try {
          console.log(`[API DEBUG] Fetching iframe page to extract video source...`);
          const iframeResponse = await fetch(decodedUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
              'Referer': 'https://iframe.mediadelivery.net/',
            },
            redirect: 'follow'
          });
          
          if (iframeResponse.ok) {
            const html = await iframeResponse.text();
            console.log(`[API DEBUG] Iframe page fetched, searching for video source...`);
            
            // Try to find video source in various formats
            // Look for video src attributes
            const videoSrcMatch = html.match(/<video[^>]*src=["']([^"']+)["']/i) || 
                                          html.match(/src=["']([^"']*\.mp4[^"']*)["']/i) ||
                                          html.match(/source[^>]*src=["']([^"']*\.mp4[^"']*)["']/i);
            
            if (videoSrcMatch && videoSrcMatch[1]) {
              extractedVideoUrl = videoSrcMatch[1];
              // Make sure it's a full URL
              if (!extractedVideoUrl.startsWith('http')) {
                extractedVideoUrl = new URL(extractedVideoUrl, decodedUrl).href;
              }
              console.log(`[API DEBUG] Found video source in iframe: ${extractedVideoUrl}`);
            }
            
            // Also try to find Bunny.net CDN URLs
            const bunnyCdnMatch = html.match(/(https?:\/\/[^"'\s]*b-cdn\.net[^"'\s]*\.mp4[^"'\s]*)/i);
            if (bunnyCdnMatch && bunnyCdnMatch[1]) {
              extractedVideoUrl = bunnyCdnMatch[1];
              console.log(`[API DEBUG] Found Bunny CDN URL in iframe: ${extractedVideoUrl}`);
            }
            
            // Look for video manifest or playlist files
            const manifestMatch = html.match(/(https?:\/\/[^"'\s]*\.m3u8[^"'\s]*)/i);
            if (manifestMatch && manifestMatch[1]) {
              extractedVideoUrl = manifestMatch[1];
              console.log(`[API DEBUG] Found video manifest: ${extractedVideoUrl}`);
            }
          }
        } catch (error) {
          console.error(`[API DEBUG] Error fetching iframe page:`, error);
        }
        
        // Build list of URLs to try (prioritize extracted URL)
        const urlsToTry: string[] = [];
        
        // Add extracted URL first if found
        if (extractedVideoUrl) {
          urlsToTry.push(extractedVideoUrl);
        }
        
        // Add constructed CDN URLs with different patterns
        urlsToTry.push(
          `https://vz-${libraryId}.b-cdn.net/${videoId}/play_720p.mp4`,
          `https://vz-${libraryId}.b-cdn.net/${videoId}/play_1080p.mp4`,
          `https://vz-${libraryId}.b-cdn.net/${videoId}/play.mp4`,
          `https://vz-${libraryId}.b-cdn.net/${videoId}/original.mp4`,
          `https://vz-${libraryId}.b-cdn.net/${videoId}/play_480p.mp4`,
          `https://vz-${libraryId}.b-cdn.net/${videoId}/play_360p.mp4`,
          `https://vz-${libraryId}.b-cdn.net/${videoId}/video.mp4`,
          `https://${libraryId}.b-cdn.net/${videoId}/play_720p.mp4`,
          `https://${libraryId}.b-cdn.net/${videoId}/play.mp4`
        );
        
        console.log(`[API DEBUG] Trying ${urlsToTry.length} URL options...`);
        
        // Try each URL until one works
        for (let i = 0; i < urlsToTry.length; i++) {
          const directUrl = urlsToTry[i];
          console.log(`[API DEBUG] Trying URL option ${i + 1}/${urlsToTry.length}: ${directUrl}`);
          try {
            const response = await fetch(directUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Referer': 'https://iframe.mediadelivery.net/',
                'Origin': 'https://iframe.mediadelivery.net',
              },
              redirect: 'follow',
              method: 'HEAD' // Try HEAD first to check if file exists
            });

            console.log(`[API DEBUG] HEAD Response status for ${directUrl}: ${response.status}`);
            
            // If HEAD works, try GET
            if (response.ok) {
              console.log(`[API DEBUG] HEAD successful, trying GET...`);
              const getResponse = await fetch(directUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': '*/*',
                  'Referer': 'https://iframe.mediadelivery.net/',
                  'Origin': 'https://iframe.mediadelivery.net',
                },
                redirect: 'follow'
              });

              console.log(`[API DEBUG] GET Response status: ${getResponse.status}`);
              console.log(`[API DEBUG] Response headers:`, {
                'content-type': getResponse.headers.get('content-type'),
                'content-length': getResponse.headers.get('content-length'),
                'status': getResponse.status
              });

              if (getResponse.ok && isVideoResponse(getResponse)) {
                console.log(`[API DEBUG] mediadelivery.net download successful! Using URL: ${directUrl}`);
                
                const headers = new Headers();
                headers.set('Content-Type', getResponse.headers.get('content-type') || 'video/mp4');
                headers.set('Content-Disposition', `attachment; filename="${filename}"`);
                headers.set('Access-Control-Allow-Origin', '*');
                headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
                headers.set('Access-Control-Allow-Headers', 'Range');
                
                if (getResponse.headers.get('content-length')) {
                  headers.set('Content-Length', getResponse.headers.get('content-length')!);
                }
                
                return new NextResponse(getResponse.body, {
                  status: getResponse.status,
                  headers
                });
              } else if (getResponse.status === 403) {
                console.log(`[API DEBUG] GET returned 403 Forbidden for ${directUrl} - CDN blocking direct access`);
                // Continue to next URL option
              } else {
                console.log(`[API DEBUG] GET failed: response.ok=${getResponse.ok}, isVideoResponse=${isVideoResponse(getResponse)}`);
              }
            } else if (response.status === 403) {
              console.log(`[API DEBUG] HEAD returned 403 Forbidden for ${directUrl} - CDN blocking direct access`);
              // Continue to next URL option
            }
          } catch (error) {
            console.error(`[API DEBUG] Error trying URL option ${i + 1}:`, error);
            // Try next URL option
            continue;
          }
        }
        
        // If all URL options failed, return fallback with original URL
        console.error(`[API DEBUG] All URL options failed for mediadelivery.net URL`);
        return NextResponse.json({ 
          error: 'Direct download is not available for this video. Bunny.net CDN blocks direct downloads. Please use the video player to watch the video, or try right-clicking the video player and selecting "Save video as..." if available.',
          fallbackUrl: decodedUrl,
          message: 'For mediadelivery.net videos, direct download via API is restricted. You can watch the video in the player or try browser-based download methods.',
          code: 'CDN_BLOCKED'
        }, { status: 403 });
      } else {
        console.error(`[API DEBUG] Failed to extract libraryId/videoId from URL: ${decodedUrl}`);
        return NextResponse.json({ 
          error: 'Invalid mediadelivery.net URL format',
          fallbackUrl: decodedUrl
        }, { status: 400 });
      }
    }
    
    // 4. Other URLs (YouTube, Vimeo, etc.) - cannot be directly downloaded
    console.log(`[API DEBUG] URL type not directly downloadable: ${decodedUrl}`);
    console.log(`[API DEBUG] URL check results:`, {
      isDirectVideo: isDirectVideoUrl(decodedUrl),
      isGoogleDrive: !!extractGoogleDriveFileId(decodedUrl),
      isMediaDelivery: decodedUrl.includes('mediadelivery.net')
    });
    return NextResponse.json({ 
      error: 'This video URL cannot be downloaded directly. Please use the video player or open the link in a new tab.',
      fallbackUrl: decodedUrl,
      message: 'For iframe-embeddable videos (like YouTube, Vimeo), direct download is not supported. The video URL will be opened in a new tab instead.'
    }, { status: 400 });
    
  } catch (error) {
    console.error('[API DEBUG] Download error:', error);
    console.error('[API DEBUG] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    },
  });
}
