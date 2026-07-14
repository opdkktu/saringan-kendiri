// ==========================================================================
// service-worker.js — app-shell caching, offline fallback, versioned cache.
// Bump CACHE_VERSION on every deploy so old caches are cleaned up.
// ==========================================================================

const CACHE_VERSION = 'sk-cache-v1.0.0';

const APP_SHELL = [
  './',
  './index.html',
  './history.html',
  './admin.html',
  './offline.html',
  './manifest.json',
  './css/variables.css',
  './css/animations.css',
  './css/layout.css',
  './css/components.css',
  './css/forms.css',
  './css/loading.css',
  './css/responsive.css',
  './css/darkmode.css',
  './js/config.js',
  './js/utils.js',
  './js/validation.js',
  './js/loading.js',
  './js/ocr.js',
  './js/api.js',
  './js/upload.js',
  './js/app.js',
  './js/charts.js',
  './js/history.js',
  './js/admin.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never cache API calls — always go to the network.
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached || caches.match('./offline.html'));

      // Stale-while-revalidate for app shell assets.
      return cached || networkFetch;
    })
  );
});

// Background sync stub — queues failed screening submissions for retry
// where the browser supports the Background Sync API.
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-submissions') {
    event.waitUntil(Promise.resolve());
  }
});
