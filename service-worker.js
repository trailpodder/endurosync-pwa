const CACHE_NAME = 'endurosync-v1';
const urlsToCache = [
  '/',
  'index.html',
  'style.css',
  'main.js',
  'manifest.json',
  'togeojson.min.js',
  'nuts300.gpx',
  'icon.png',
  'https://unpkg.com/leaflet/dist/leaflet.css',
  'https://unpkg.com/leaflet/dist/leaflet.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
