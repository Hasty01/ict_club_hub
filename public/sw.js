// ============================
// Service Worker: sw.js (fixed)
// ============================

const CACHE_NAME = 'ict-club-hub-v6';
const DATA_CACHE_NAME = 'ict-club-data-v6';

const PRECACHE_ASSETS = [
  '/', 
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

const STATIC_DOMAINS = [
  'cdn.tailwindcss.com',
  'aistudiocdn.com',
  'esm.sh',
  'cdn.jsdelivr.net'
];

// ----------------------------
// Install: Safe precache
// ----------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('Failed to precache:', asset);
        }
      }
    })()
  );
  self.skipWaiting();
});

// ----------------------------
// Activate: Cleanup old caches
// ----------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(name => name !== CACHE_NAME && name !== DATA_CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ----------------------------
// Fetch: Smart caching logic
// ----------------------------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isHttp = url.protocol.startsWith('http');

  // 1. Pyodide (cache-first)
  if (isHttp && url.href.includes('pyodide')) {
    event.respondWith(cacheFirst(event.request, CACHE_NAME));
    return;
  }

  // 2. Supabase GET (network-first)
  if (isHttp && url.hostname.includes('supabase.co') && event.request.method === 'GET') {
    event.respondWith(networkFirst(event.request, DATA_CACHE_NAME));
    return;
  }

  // 3. CDN static files (stale-while-revalidate)
  if (isHttp && STATIC_DOMAINS.some(d => url.hostname.includes(d))) {
    event.respondWith(staleWhileRevalidate(event.request, CACHE_NAME));
    return;
  }

  // 4. Build assets (/assets/) use NETWORK-FIRST to fix update issues
  if (isHttp && url.pathname.startsWith('/assets/')) {
    event.respondWith(networkFirst(event.request, CACHE_NAME));
    return;
  }

  // 5. Default (cache-first)
  if (isHttp) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('', { status: 503, statusText: 'Offline' });
        });
      })
    );
  }
});

// ======================================================
// CACHE HELPERS
// ======================================================

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;

  const res = await fetch(req);
  cache.put(req, res.clone());
  return res;
}

async function networkFirst(req, cacheName) {
  try {
    const res = await fetch(req);
    const cache = await caches.open(cacheName);
    cache.put(req, res.clone());
    return res;
  } catch {
    const cache = await caches.open(cacheName);
    return await cache.match(req);
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req)
    .then(res => {
      cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}
