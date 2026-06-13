const CACHE_NAME = 'receipt-v1';
const ASSETS = [
  './receipt.html',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // GAS requests should always go to network
  if (e.request.method === 'POST') return;

  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
