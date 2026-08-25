const CACHE_NAME = 'srpw-v2.2-live';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './candela.png',
  './cayetana.png',
  './valentina.png',
  './mama.png',
  './papa.png',
  './tommy.png',
  './world_map_diorama.png',
  './master_trophy.png',
  './assets/candela.png',
  './assets/cayetana.png',
  './assets/valentina.png',
  './assets/mama.png',
  './assets/papa.png',
  './assets/tommy.png',
  './assets/world_map_diorama.png',
  './assets/master_trophy.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => console.log('SW cache partial:', err));
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First for HTML/Scripts so updates are immediately loaded
self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate' || e.request.destination === 'document' || e.request.url.includes('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first fallback to network for heavy media assets
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).then((res) => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        return res;
      }).catch(() => null);
    })
  );
});
