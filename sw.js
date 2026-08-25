const CACHE_NAME = 'rivelles-world-v1.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/candela.png',
  './assets/cayetana.png',
  './assets/valentina.png',
  './assets/mama.png',
  './assets/papa.png',
  './assets/tommy.png',
  './assets/world_map_diorama.png',
  './assets/boss_acornus.png',
  './assets/boss_octobeard.png',
  './assets/boss_tutankobra.png',
  './assets/boss_marionetta.png',
  './assets/boss_frostfang.png',
  './assets/boss_tempesto.png',
  './assets/boss_graviton.png',
  './assets/boss_cosmomecha.png',
  './assets/boss_infernus.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => console.log('SW cache partial:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).then((res) => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
