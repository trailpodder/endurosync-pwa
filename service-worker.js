const CACHE_NAME = 'endurosync-cache-v1';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'main.js',
  'manifest.json',
  'icon.png',
  'nuts300.gpx',
  'https://unpkg.com/leaflet/dist/leaflet.css',
  'https://unpkg.com/leaflet/dist/leaflet.js',
  'https://unpkg.com/togeojson@0.16.0/dist/togeojson.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
