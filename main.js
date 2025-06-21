const map = L.map('map').setView([68.75, 26.22], 10);

// Base map
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Load GPX route
fetch('nuts300.gpx')
  .then(res => res.text())
  .then(gpxText => {
    const gpx = new DOMParser().parseFromString(gpxText, 'application/xml');
    new L.GPX(gpx, {
      async: true,
      marker_options: {
        startIconUrl: null,
        endIconUrl: null,
        shadowUrl: null
      }
    }).on('loaded', function(e) {
      map.fitBounds(e.target.getBounds());
    }).addTo(map);
  });

// Aid stations
const aidStations = [
  { name: 'Kalmakaltio', km: 88, lat: 68.65, lon: 24.82, cutoff: 'Tue 12:00' },
  { name: 'Hetta',        km: 206, lat: 68.38, lon: 23.63, cutoff: 'Thu 13:00' },
  { name: 'Pallas',       km: 261, lat: 68.05, lon: 24.07, cutoff: 'Fri 13:00' },
  { name: 'Rauhala',      km: 284, lat: 67.90, lon: 24.19 },
  { name: 'Pahtavuoma',   km: 295, lat: 67.85, lon: 24.37 },
  { name: 'Peurakaltio',  km: 309, lat: 67.75, lon: 24.45 },
  { name: 'Finish (Äkäslompolo)', km: 326, lat: 67.63, lon: 24.15, cutoff: 'Sat 18:00' },
];

// Add markers
aidStations.forEach(station => {
  const marker = L.marker([station.lat, station.lon]).addTo(map);
  const info = `<b>${station.name}</b><br>${station.km} km` +
               (station.cutoff ? `<br>⏱ Cutoff: ${station.cutoff}` : '');
  marker.bindPopup(info);
});
