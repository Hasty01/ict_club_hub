
const CACHE_NAME = 'ict-club-hub-v8';
const DATA_CACHE_NAME = 'ict-club-data-v8';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// Install: pre-cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: delete old caches and notify clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );

  // Tell the UI that a new SW is active
  self.clients.matchAll().then(clients => {
    clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }));
  });

  self.clients.claim();
});

// Main fetch handler
self.addEventListener('fetch', event => {
  const url = event.request.url;
  const method = event.request.method;

  // 1. SPA NAVIGATION: Always try network first for index.html
  // This ensures users get the latest version immediately upon refresh
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 2. API ROUTES (only cache GET to avoid PATCH/POST errors)
  // Checking both local /api/ and Supabase to ensure app data works
  if (url.includes('/api/') || url.includes('supabase.co')) {
    if (method !== 'GET') {
      // Don't cache mutations (PATCH/POST/PUT/DELETE)
      event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
      return;
    }

    // Network First for API data
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(cache =>
        fetch(event.request)
          .then(response => {
            // Clone and cache successful GET responses
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => caches.match(event.request))
      )
    );
    return;
  }

  // 3. VITE FINGERPRINTED ASSETS & STATIC FILES
  if (url.includes('/assets/') || PRECACHE_ASSETS.some(asset => url.endsWith(asset))) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return (
          cached ||
          fetch(event.request).then(response => {
            if (response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
            }
            return response;
          })
        );
      })
    );
    return;
  }

  // 4. FALLBACK -> cache first, then network
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// Allow the UI to request immediate activation
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
