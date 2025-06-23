// main.js

document.addEventListener("DOMContentLoaded", () => {
  const map = L.map("map").setView([68.3, 21.5], 9);

// Remove existing map if it already exists (e.g., on reload)
if (window.map) {
  window.map.remove();
}

// Initialize Leaflet map
window.map = L.map('map').setView([68.5, 21.5], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(window.map);

// Load and parse GPX
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
    const chart = echarts.init(document.getElementById('elevation'));
    const distances = [];
    const elevations = [];
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
      const [lon1, lat1] = coords[i - 1];
      const [lon2, lat2] = coords[i];
      const dx = turf.distance(turf.point([lon1, lat1]), turf.point([lon2, lat2]));
      total += dx;
      distances.push(total * 1000); // km to meters
      elevations.push(coords[i][2] || 0);
    }

    chart.setOption({
      xAxis: { type: 'category', data: distances.map(d => (d / 1000).toFixed(1)) },
      yAxis: { type: 'value', name: 'Elevation (m)' },
      tooltip: { trigger: 'axis' },
      series: [{ data: elevations, type: 'line', areaStyle: {} }]
    });

    // Store for later use
    window.trackCoords = coords;
    addAidStations();
    updatePlanner();
  })
  .catch(err => {
    console.error("Error loading GPX:", err);
  });

// Aid station definitions
const aidStations = [
  { name: "Njurgulahti (Start)", km: 0, cutoff: "Mon 12:00" },
  { name: "Kalmakaltio", km: 88, cutoff: "Tue 12:00" },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00" },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00" },
  { name: "Rauhala", km: 277, cutoff: null },
  { name: "Pahtavuoma", km: 288, cutoff: null },
  { name: "Peurakaltio", km: 301, cutoff: null },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00" }
];

const restHours = {
  "Kalmakaltio": 1,
  "Hetta": 2,
  "Pallas": 3
};

// Get LatLng along track at distance km
function getLatLngAtKm(km) {
  const meters = km * 1000;
  let sum = 0;
  for (let i = 1; i < window.trackCoords.length; i++) {
    const prev = window.trackCoords[i - 1];
    const curr = window.trackCoords[i];
    const dist = turf.distance(turf.point([prev[0], prev[1]]), turf.point([curr[0], curr[1]])) * 1000;
    if (sum + dist >= meters) {
      const ratio = (meters - sum) / dist;
      const lat = prev[1] + (curr[1] - prev[1]) * ratio;
      const lon = prev[0] + (curr[0] - prev[0]) * ratio;
      return [lat, lon];
    }
    sum += dist;
  }
  return [window.trackCoords.at(-1)[1], window.trackCoords.at(-1)[0]];
}

// Add aid stations to map
function addAidStations() {
  aidStations.forEach(station => {
    const latlng = getLatLngAtKm(station.km);
    L.circleMarker(latlng, {
      radius: 6,
      fillColor: 'red',
      color: '#000',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(map).bindPopup(`${station.name}<br>${station.cutoff || ''}`);
  });
}

// Update planner display
function updatePlanner() {
  const goalInput = document.getElementById('goalTime');
  const goalHours = parseFloat(goalInput.value);
  if (isNaN(goalHours)) return;

  const totalRest = aidStations.reduce((sum, s) => sum + (restHours[s.name] || 0), 0);
  const movingHours = goalHours - totalRest;

  const output = document.getElementById('plannerOutput');
  output.innerHTML = '';
  for (let i = 1; i < aidStations.length; i++) {
    const prev = aidStations[i - 1];
    const curr = aidStations[i];
    const dist = curr.km - prev.km;
    const movingTime = (dist / (326 - 0)) * movingHours;
    const rest = restHours[curr.name] || 0;
    const totalTime = movingTime + rest;

    const row = document.createElement('div');
    row.textContent = `${prev.name} → ${curr.name}: ${dist} km, moving ${movingTime.toFixed(1)}h, rest ${rest}h, total ${totalTime.toFixed(1)}h`;
    output.appendChild(row);
  }
}

// Event listener
document.getElementById('goalTime').addEventListener('input', updatePlanner);
});
