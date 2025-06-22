// main.js

// Initialize the map
const map = L.map('map').setView([68.5, 22.5], 8);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Load and display the GPX route
fetch('nuts300.gpx')
  .then(res => res.text())
  .then(gpxText => {
    const parser = new DOMParser();
    const gpx = parser.parseFromString(gpxText, 'application/xml');
    const geojson = toGeoJSON.gpx(gpx);
    const route = L.geoJSON(geojson, { color: 'blue' }).addTo(map);
    map.fitBounds(route.getBounds());

    // Elevation chart setup
    const chart = echarts.init(document.getElementById('elevation-chart'));
    const coords = geojson.features[0].geometry.coordinates;
    const elevationData = coords.map(c => c[2] || 0);
    const distanceData = coords.map((_, i) => i * 0.05); // Rough approx, can be improved

    chart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: distanceData.map(d => d.toFixed(1)) },
      yAxis: { type: 'value', name: 'Elevation (m)' },
      series: [{
        data: elevationData,
        type: 'line',
        areaStyle: {}
      }]
    });

    // Aid station definitions (user-provided)
    const aidStations = [
      { name: "Kalmakaltio", km: 88, cutoff: "Tue 12:00" },
      { name: "Hetta", km: 192, cutoff: "Thu 13:00" },
      { name: "Pallas", km: 256, cutoff: "Fri 13:00" },
      { name: "Rauhala", km: 277, cutoff: null },
      { name: "Pahtavuoma", km: 288, cutoff: null },
      { name: "Peurakaltio", km: 301, cutoff: null },
      { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00" }
    ];

    // Get LatLng along route at approximate distance
    function getLatLngAtKm(geojson, targetKm) {
      const coords = geojson.features[0].geometry.coordinates;
      let total = 0;
      for (let i = 1; i < coords.length; i++) {
        const a = L.latLng(coords[i - 1][1], coords[i - 1][0]);
        const b = L.latLng(coords[i][1], coords[i][0]);
        const d = a.distanceTo(b) / 1000; // km
        total += d;
        if (total >= targetKm) return b;
      }
      return L.latLng(coords.at(-1)[1], coords.at(-1)[0]);
    }

    aidStations.forEach(station => {
      const latlng = getLatLngAtKm(geojson, station.km);
      L.marker(latlng)
        .addTo(map)
        .bindPopup(`<b>${station.name}</b><br>km ${station.km}<br>Cutoff: ${station.cutoff || '—'}`);
    });

  })
  .catch(err => console.error("Error loading GPX:", err));

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('✅ Service Worker registered'))
    .catch(err => console.error('Service Worker error:', err));
}
