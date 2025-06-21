let map = L.map('map').setView([68.5, 23.7], 8);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
}).addTo(map);

// Load and display GPX file
fetch('nuts300.gpx')
  .then(response => response.text())
  .then(gpxText => {
    const parser = new DOMParser();
    const gpx = parser.parseFromString(gpxText, 'application/xml');
    const geojson = toGeoJSON.gpx(gpx);

    const gpxLayer = L.geoJSON(geojson, {
      style: { color: 'blue', weight: 3 }
    }).addTo(map);

    map.fitBounds(gpxLayer.getBounds());

    // Aid station data (name, km, [lat, lon], cutoff)
    const aidStations = [
      { name: 'Kalmakaltio', km: 88, coords: [68.506, 24.019], cutoff: 'Tue 12:00' },
      { name: 'Hetta', km: 118, coords: [68.383, 23.624], cutoff: 'Thu 13:00' },
      { name: 'Pallas', km: 261, coords: [68.054, 24.072], cutoff: 'Fri 13:00' },
      { name: 'Rauhala', km: 284, coords: [68.051, 24.427], cutoff: '-' },
      { name: 'Pahtavuoma', km: 295, coords: [68.039, 24.616], cutoff: '-' },
      { name: 'Peurakaltio', km: 309, coords: [67.995, 24.675], cutoff: '-' },
      { name: 'Finish (Äkäslompolo)', km: 326, coords: [67.994, 24.144], cutoff: 'Sat 18:00' },
    ];

    aidStations.forEach(station => {
      L.marker(station.coords)
        .addTo(map)
        .bindPopup(`<b>${station.name}</b><br>${station.km} km<br>Cutoff: ${station.cutoff}`);
    });
  })
  .catch(error => console.error('Error loading GPX:', error));

// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('✅ Service Worker registered'))
    .catch(err => console.error('❌ Service Worker registration failed:', err));
}
