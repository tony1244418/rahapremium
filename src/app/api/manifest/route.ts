import { NextResponse } from 'next/server';

export async function GET() {
  // Return manifest directly (no file system access needed for Vercel)
  const manifest = {
    "name": "RahaPremium - Premium Entertainment Streaming",
    "short_name": "RahaPremium",
    "description": "Premium entertainment streaming platform featuring movies, TV series, and stories in Swahili and English. Designed for Tanzania and East Africa.",
    "start_url": "/?utm_source=pwa",
    "display": "standalone",
    "background_color": "#0f172a",
    "theme_color": "#1e40af",
    "orientation": "portrait-primary",
    "scope": "/",
    "lang": "sw",
    "dir": "ltr",
    "categories": ["entertainment", "video", "streaming"],
    "icons": [
      {
        "src": "/icon-72x72.png",
        "sizes": "72x72",
        "type": "image/png",
        "purpose": "any maskable"
      },
      {
        "src": "/icon-96x96.png",
        "sizes": "96x96",
        "type": "image/png",
        "purpose": "any maskable"
      },
      {
        "src": "/icon-128x128.png",
        "sizes": "128x128",
        "type": "image/png",
        "purpose": "any maskable"
      },
      {
        "src": "/icon-144x144.png",
        "sizes": "144x144",
        "type": "image/png",
        "purpose": "any maskable"
      },
      {
        "src": "/icon-152x152.png",
        "sizes": "152x152",
        "type": "image/png",
        "purpose": "any maskable"
      },
      {
        "src": "/icon-192x192.png",
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "any maskable"
      },
      {
        "src": "/icon-384x384.png",
        "sizes": "384x384",
        "type": "image/png",
        "purpose": "any maskable"
      },
      {
        "src": "/icon-512x512.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any maskable"
      }
    ],
    "screenshots": [],
    "shortcuts": [
      {
        "name": "Movies",
        "short_name": "Movies",
        "description": "Browse movies",
        "url": "/movies",
        "icons": [
          {
            "src": "/icon-192x192.png",
            "sizes": "192x192"
          }
        ]
      },
      {
        "name": "Series",
        "short_name": "Series",
        "description": "Browse TV series",
        "url": "/series",
        "icons": [
          {
            "src": "/icon-192x192.png",
            "sizes": "192x192"
          }
        ]
      },
      {
        "name": "Stories",
        "short_name": "Stories",
        "description": "Read stories",
        "url": "/stories",
        "icons": [
          {
            "src": "/icon-192x192.png",
            "sizes": "192x192"
          }
        ]
      }
    ],
    "share_target": {
      "action": "/share",
      "method": "GET",
      "enctype": "application/x-www-form-urlencoded",
      "params": {
        "title": "title",
        "text": "text",
        "url": "url"
      }
    },
    "prefer_related_applications": false
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

