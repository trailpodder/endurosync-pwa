// main.js

import 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
import 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js';
import 'https://cdn.jsdelivr.net/npm/togeojson@0.16.0/dist/togeojson.umd.js';

const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: 0 },
  { name: "Kalmankaltio", km: 88, cutoff: 24 },
  { name: "Hetta", km: 192, cutoff: 73 },
  { name: "Pallas", km: 256, cutoff: 97 },
  { name: "Rauhala (water only)", km: 277 },
  { name: "Pahtavuoma (water only)", km: 288 },
  { name: "Peurakaltio (water only)", km: 301 },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: 126 }
];

const restTimeDefaults = [0, 1, 2, 3, 0, 0, 0, 0]; // Default rest times per station in hours

const restInputs = {};

function loadGPX() {
  fetch("nuts300.gpx")
    .then((res) => res.text())
    .then((gpxText) => {
      const parser = new DOMParser();
      const gpx = parser.parseFromString(gpxText, "application/xml");
      const geojson = toGeoJSON.gpx(gpx);
      const coords = geojson.features[0].geometry.coordinates.map(c => [c[1], c[0]]);

      const map = L.map('map').setView(coords[0], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      const line = L.polyline(coords, { color: 'blue' }).addTo(map);
      map.fitBounds(line.getBounds());

      aidStations.forEach((station, i) => {
        const index = Math.floor((station.km / 326) * (coords.length - 1));
        const coord = coords[index];
        L.marker(coord, {
          icon: L.icon({
            iconUrl: 'favicon.ico',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        }).addTo(map).bindPopup(`${station.name} (${station.km} km)`);
      });

      drawChart(geojson);
    })
    .catch((err) => console.error("Error loading GPX:", err));
}

function drawChart(geojson) {
  const chart = echarts.init(document.getElementById('chart'));
  const distances = [];
  const elevations = [];
  let totalDist = 0;

  const coords = geojson.features[0].geometry.coordinates;
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1, ele1] = coords[i - 1];
    const [lon2, lat2, ele2] = coords[i];
    const d = getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2);
    totalDist += d;
    distances.push(totalDist);
    elevations.push(ele2);
  }

  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: distances.map(d => d.toFixed(1)), name: 'Distance (km)' },
    yAxis: { type: 'value', name: 'Elevation (m)' },
    series: [{ data: elevations, type: 'line', areaStyle: {} }]
  });
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildPlanner() {
  const planner = document.getElementById('planner');
  planner.innerHTML = '';

  const goalTime = parseFloat(document.getElementById('goalTime').value);

  const table = document.createElement('table');
  const header = table.insertRow();
  ['From → To', 'Distance (km)', 'Run Time (h)', 'Pace (km/h)', 'Rest (h)', 'Cutoff'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    header.appendChild(th);
  });

  let totalTime = 0;
  let totalDistance = 0;

  for (let i = 1; i < aidStations.length; i++) {
    const row = table.insertRow();
    const from = aidStations[i - 1];
    const to = aidStations[i];
    const dist = to.km - from.km;

    const rest = parseFloat(restInputs[to.name]?.value || restTimeDefaults[i] || 0);
    const cutoffH = to.cutoff;
    let runTime;

    if (cutoffH) {
      runTime = cutoffH - totalTime - rest - 1; // 1h margin
      if (runTime < 0) runTime = 0;
    } else {
      const remainingTime = goalTime - totalTime - rest;
      const remainingDist = aidStations[aidStations.length - 1].km - to.km;
      runTime = (dist / (remainingDist || 1)) * remainingTime;
    }

    const pace = dist / (runTime || 1);

    row.insertCell().textContent = `${from.name} → ${to.name}`;
    row.insertCell().textContent = dist.toFixed(1);
    row.insertCell().textContent = runTime.toFixed(2);
    row.insertCell().textContent = pace.toFixed(2);

    const restInput = document.createElement('input');
    restInput.type = 'number';
    restInput.value = rest;
    restInput.min = 0;
    restInput.style.width = '3em';
    restInput.addEventListener('change', buildPlanner);
    restInputs[to.name] = restInput;
    row.insertCell().appendChild(restInput);

    row.insertCell().textContent = cutoffH ? `T+${cutoffH}h` : '-';

    totalTime += runTime + rest;
    totalDistance += dist;
  }

  const sumRow = table.insertRow();
  sumRow.insertCell().textContent = 'Total';
  sumRow.insertCell().textContent = totalDistance.toFixed(1);
  sumRow.insertCell().textContent = totalTime.toFixed(2);
  sumRow.insertCell().textContent = (totalDistance / totalTime).toFixed(2);
  sumRow.insertCell().textContent = '';
  sumRow.insertCell().textContent = '';

  planner.appendChild(table);
}

document.getElementById('recalculate').addEventListener('click', buildPlanner);
loadGPX();
buildPlanner();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(() => {
    console.log('✅ Service Worker registered');
  });
}
