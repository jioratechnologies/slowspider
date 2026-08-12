/* Slow Spider — service worker (offline app shell) */
const CACHE = 'slowspider-v17';
const SB_LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The Supabase client library (cross-origin CDN): cache-first so the app can
  // load it offline after the first run. API/auth/realtime calls go to *.supabase.co
  // (a different origin) and fall through to the network below — never cached.
  if (req.url.indexOf(SB_LIB) === 0) {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((res) => {
          try { if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } } catch (e) {}
          return res;
        }).catch(() => cached)
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return; // only handle same-origin

  // Navigation requests: serve the cached app shell, fall back to network.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => cached || fetch(req))
    );
    return;
  }

  // Assets: cache-first, then network (and cache the result).
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
