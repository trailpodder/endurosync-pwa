const CACHE_NAME = 'endurosync-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/main.js',
  '/nuts300.gpx',
  '/favicon.ico',
  '/manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js',
  'https://unpkg.com/@tmcw/togeojson@0.16.0/dist/togeojson.umd.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
