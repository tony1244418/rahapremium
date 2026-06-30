import { NextRequest, NextResponse } from 'next/server';

// Configure route for longer timeouts (important for streaming)
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for streaming

/**
 * Proxy API route to handle HTTP streams on HTTPS pages
 * This avoids mixed content blocking by fetching the stream server-side
 * and serving it over HTTPS
 * 
 * For HLS streams, this proxies the manifest. HLS.js will handle segment requests.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const streamUrl = searchParams.get('url');

    if (!streamUrl) {
      return NextResponse.json(
        { error: 'Stream URL is required' },
        { status: 400 }
      );
    }

    // Decode the URL
    const decodedUrl = decodeURIComponent(streamUrl);

    // Security: Only allow HTTP/HTTPS URLs
    if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Invalid URL protocol' },
        { status: 400 }
      );
    }

    console.log('[PROXY] Fetching stream from:', decodedUrl);

    // Fetch the stream server-side with timeout
    let response: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      response = await fetch(decodedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Referer': new URL(decodedUrl).origin,
        },
        redirect: 'follow',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch (error: any) {
      console.error('[PROXY] Fetch error:', error);
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout - stream server did not respond in time' },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { 
          error: 'Failed to fetch stream',
          details: error.message || 'Network error'
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.error('[PROXY] Stream fetch failed:', response.status, response.statusText);
      return NextResponse.json(
        { 
          error: `Failed to fetch stream: ${response.status} ${response.statusText}`,
          url: decodedUrl
        },
        { status: response.status }
      );
    }

    // Get the content type from the response
    let contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Check if response is HTML (might be an error page or redirect)
    if (contentType.includes('text/html')) {
      const htmlText = await response.text();
      console.error('[PROXY] Received HTML instead of stream. This might be an error page.');
      console.error('[PROXY] HTML preview:', htmlText.substring(0, 500));
      return NextResponse.json(
        { 
          error: 'Stream URL returned HTML instead of a video stream. The URL might be incorrect or the server might be blocking the request.',
          contentType: contentType
        },
        { status: 400 }
      );
    }
    
    // Handle HLS manifest files - rewrite URLs to use proxy
    if (contentType.includes('application/x-mpegURL') || contentType.includes('application/vnd.apple.mpegurl') || decodedUrl.includes('.m3u8')) {
      let manifestText: string;
      try {
        manifestText = await response.text();
      } catch (error) {
        console.error('[PROXY] Failed to read manifest:', error);
        return NextResponse.json(
          { error: 'Failed to read stream manifest' },
          { status: 500 }
        );
      }
      
      // Rewrite relative URLs in the manifest to use proxy
      // This handles both relative and absolute HTTP URLs in the manifest
      const baseUrl = new URL(decodedUrl);
      const basePath = baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/') + 1);
      
      const rewrittenManifest = manifestText
        .split('\n')
        .map(line => {
          // Skip comments and empty lines
          if (line.trim().startsWith('#') || !line.trim()) {
            return line;
          }
          
          // If line is a URL
          if (line.trim().startsWith('http://')) {
            // Rewrite HTTP URLs to use proxy
            return `/api/proxy-stream?url=${encodeURIComponent(line.trim())}`;
          } else if (line.trim().startsWith('/')) {
            // Absolute path - construct full URL
            const fullUrl = `${baseUrl.protocol}//${baseUrl.host}${line.trim()}`;
            return `/api/proxy-stream?url=${encodeURIComponent(fullUrl)}`;
          } else if (!line.trim().startsWith('http')) {
            // Relative path - construct full URL
            const fullUrl = `${baseUrl.protocol}//${baseUrl.host}${basePath}${line.trim()}`;
            return `/api/proxy-stream?url=${encodeURIComponent(fullUrl)}`;
          }
          return line;
        })
        .join('\n');

      const headers = new Headers();
      headers.set('Content-Type', contentType);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');

      return new NextResponse(rewrittenManifest, {
        status: 200,
        headers: headers,
      });
    }

    // Get other important headers for non-HLS content
    const contentLength = response.headers.get('content-length');
    const acceptRanges = response.headers.get('accept-ranges');
    const cacheControl = response.headers.get('cache-control');

    console.log('[PROXY] Stream fetched successfully. Content-Type:', contentType);

    // Create response headers
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    
    // Copy relevant headers
    if (contentLength) headers.set('Content-Length', contentLength);
    if (acceptRanges) headers.set('Accept-Ranges', acceptRanges);
    if (cacheControl) headers.set('Cache-Control', cacheControl);
    
    // CORS headers to allow the client to access the stream
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    // For streaming content, don't buffer
    if (contentType.includes('video') || contentType.includes('audio') || contentType.includes('application/dash+xml')) {
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
    }

    // Stream the response back to the client
    return new NextResponse(response.body, {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error('[PROXY] Error proxying stream:', error);
    console.error('[PROXY] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Handle specific error types
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          error: 'Network error - could not connect to stream server',
          details: error.message
        },
        { status: 502 }
      );
    }
    
    if (error instanceof Error && error.message.includes('Invalid URL')) {
      return NextResponse.json(
        { 
          error: 'Invalid stream URL format',
          details: error.message
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to proxy stream',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

