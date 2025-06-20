self.addEventListener('install', event => {
  event.waitUntil(caches.open('endurosync-v1').then(cache => {
    return cache.addAll([
      './',
      './index.html',
      './main.js',
      './manifest.json',
      './icon.png'
      '/t806536562_nuts 300.gpx'
    ]);
  }));
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
