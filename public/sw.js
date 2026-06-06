// Service Worker for RahaPremium PWA
// v3 — fixed CORS redirect issue (removed apex '/' from cache list)
const CACHE_NAME = 'rahapremium-v3';

// Only cache static assets that don't redirect.
// Removed '/' because on Hostinger the apex (rahapremium.com) redirects
// to www, which triggers a cross-origin redirect the SW can't follow.
const urlsToCache = [
  '/manifest.json',
  '/logo.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        // Use individual fetches so one failure doesn't block others
        return Promise.allSettled(
          urlsToCache.map(url => cache.add(url).catch(err => {
            console.warn('SW: Failed to cache', url, err);
          }))
        );
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = event.request.url;

  // Skip API routes (must always be fresh)
  if (url.includes('/api/')) return;

  // Skip Next.js internal HMR / build routes
  if (url.includes('/_next/webpack-hmr') || url.includes('/__nextjs')) return;

  // Skip cross-origin requests entirely — don't intercept CDN, Supabase, etc.
  if (!url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        // For _next/static assets: cache-first (they have content-hash in filename)
        if (url.includes('/_next/static/') && cached) {
          return cached;
        }

        // For everything else: network-first, cache on success
        return fetch(event.request)
          .then((response) => {
            // Only cache valid same-origin responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(() => {
            // Network failed — return cached version if we have one
            if (cached) return cached;
            // For document requests, return nothing (browser shows its own error)
          });
      })
  );
});
