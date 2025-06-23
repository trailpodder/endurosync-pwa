// Initialize map
const map = L.map('map').setView([68.3, 23.7], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Load GPX and convert to GeoJSON
fetch('nuts300.gpx')
  .then(res => res.text())
  .then(gpxText => {
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxText, 'application/xml');
    const geojson = toGeoJSON.gpx(gpxDoc);

    const coords = geojson.features[0].geometry.coordinates;
    const latlngs = coords.map(c => [c[1], c[0]]);
    const polyline = L.polyline(latlngs, { color: 'blue' }).addTo(map);
    map.fitBounds(polyline.getBounds());

    // Elevation chart
    const elevation = coords.map(c => c[2] || 0);
    const chart = echarts.init(document.getElementById('elevation'));
    chart.setOption({
      xAxis: { type: 'category', show: false, data: elevation.map((_, i) => i) },
      yAxis: { type: 'value', name: 'Elevation (m)' },
      series: [{ data: elevation, type: 'line', showSymbol: false }]
    });

    // Save for planner access
    window.routeCoords = coords;
  })
  .catch(err => {
    console.error("Error loading GPX:", err);
  });

// Aid station data (with default rest times)
const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00", rest: 0 },
  { name: "Kalmakaltio", km: 88, cutoff: "Tue 12:00", rest: 1 },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00", rest: 2 },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00", rest: 3 },
  { name: "Rauhala", km: 277, cutoff: null, rest: 0 },
  { name: "Pahtavuoma", km: 288, cutoff: null, rest: 0 },
  { name: "Peurakaltio", km: 301, cutoff: null, rest: 0 },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00", rest: 0 }
];

// Helper to get lat/lng at specific km along route
function getLatLngAtKm(km) {
  if (!window.routeCoords) return [0, 0];
  const total = window.routeCoords.length;
  const routeDist = 326; // total km
  const index = Math.floor((km / routeDist) * total);
  const coord = window.routeCoords[Math.min(index, total - 1)];
  return [coord[1], coord[0]];
}

// Add markers
aidStations.forEach(station => {
  const latlng = getLatLngAtKm(station.km);
  L.circleMarker(latlng, {
    radius: 6,
    color: 'red',
    fillColor: 'white',
    fillOpacity: 1
  }).addTo(map).bindPopup(`${station.name} (${station.km} km)`);
});

// Build table based on goal time
function updatePlanner() {
  const goalHours = parseFloat(document.getElementById('goalTime').value);
  const tbody = document.querySelector('#planTable tbody');
  tbody.innerHTML = "";

  let totalMovingHours = goalHours;
  let totalRest = aidStations.reduce((sum, s) => sum + (s.rest || 0), 0);
  totalMovingHours -= totalRest;

  for (let i = 1; i < aidStations.length; i++) {
    const prev = aidStations[i - 1];
    const curr = aidStations[i];
    const segmentKm = curr.km - prev.km;
    const segmentTime = (segmentKm / 326) * totalMovingHours;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${prev.name} → ${curr.name}</td>
      <td>${segmentKm.toFixed(1)}</td>
      <td>${segmentTime.toFixed(1)}</td>
      <td>${curr.cutoff || ""}</td>
      <td>${curr.rest || 0}</td>
    `;
    tbody.appendChild(row);
  }
}

window.updatePlanner = updatePlanner;
updatePlanner();

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log("✅ Service Worker registered"))
    .catch(err => console.warn("Service Worker error:", err));
}
