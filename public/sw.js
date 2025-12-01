// ============================
// Service Worker: sw.js
// ============================

// Versioned cache names
const CACHE_VERSION = 'v2'; // Increment this on each deploy
const CACHE_NAME = `my-app-cache-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `my-app-data-${CACHE_VERSION}`;

// List of assets to pre-cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/bundle.js',
  '/favicon.ico',
  // Add other static files here
];

// ============================
// Install event: pre-cache static assets
// ============================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ============================
// Activate event: remove old caches
// ============================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== DATA_CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ============================
// Fetch event: network-first for JS/CSS, cache-first for others
// ============================
self.addEventListener('fetch', event => {
  const request = event.request;

  // Network-first for JS/CSS to ensure latest code
  if (request.url.endsWith('.js') || request.url.endsWith('.css')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Update cache with latest version
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Network-first for API/data requests
  if (request.url.includes('/api/') || request.url.includes('/supabase/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(DATA_CACHE_NAME).then(cache => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Default: cache-first for static assets
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
