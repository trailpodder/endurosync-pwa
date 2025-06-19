self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('endurosync-cache').then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './main.js',
        './togeojson.js',
        './manifest.json',
        './icons/icon-192.png',
        './icons/icon-512.png'
      ]);
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
