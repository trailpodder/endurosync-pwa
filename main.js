// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('✅ Service Worker registered'))
    .catch(err => console.error('Service Worker error:', err));
}

// Initialize Leaflet map
const map = L.map('map').setView([68.4, 23.7], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18
}).addTo(map);

// Load GPX file and display on map
fetch('nuts300.gpx?v=20250619')
  .then(response => response.text())
  .then(gpxText => {
    const parser = new DOMParser();
    const gpx = parser.parseFromString(gpxText, 'application/xml');
    const geojson = toGeoJSON.gpx(gpx);

    const track = L.geoJSON(geojson, {
      style: { color: '#0074D9', weight: 4 }
    }).addTo(map);

    map.fitBounds(track.getBounds());
  })
  .catch(err => console.error('Error loading GPX:', err));
