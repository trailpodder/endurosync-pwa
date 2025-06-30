import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';

const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: 0, rest: 0 },
  { name: "Kalmankaltio", km: 88, cutoff: 24, rest: 1 },
  { name: "Hetta", km: 192, cutoff: 73, rest: 2 },
  { name: "Pallas", km: 256, cutoff: 97, rest: 3 },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: 126, rest: 0 }
];

let map, routeLayer, chart, elevationData = [];

async function loadGPX(url) {
  const res = await fetch(url);
  const gpxText = await res.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(gpxText, 'application/xml');
  return togeojson.gpx(xml);
}

function initMap(geojson) {
  map = L.map('map').setView([68.3, 22.5], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  routeLayer = L.geoJSON(geojson).addTo(map);
  map.fitBounds(routeLayer.getBounds());

  // Add aid stations
  aidStations.forEach(station => {
    const latlng = getLatLngAtKm(geojson, station.km);
    if (latlng) {
      L.marker(latlng).addTo(map).bindPopup(`${station.name} (${station.km} km)`);
    }
  });
}

function getLatLngAtKm(geojson, targetKm) {
  let total = 0;
  const coords = geojson.features[0].geometry.coordinates;
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    const dist = haversine(lat1, lon1, lat2, lon2);
    total += dist;
    if (total >= targetKm) return [lat2, lon2];
  }
  return null;
}

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildElevationChart(geojson) {
  const coords = geojson.features[0].geometry.coordinates;
  const distances = [];
  const elevations = [];
  let total = 0;

  for (let i = 0; i < coords.length; i++) {
    const [lon, lat, ele] = coords[i];
    if (i > 0) {
      total += haversine(coords[i - 1][1], coords[i - 1][0], lat, lon);
    }
    distances.push(total.toFixed(1));
    elevations.push(ele || 0);
  }

  elevationData = distances.map((d, i) => ({ x: +d, y: elevations[i] }));

  const ctx = document.getElementById('chart');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: 'Elevation (m)',
        data: elevationData,
        borderColor: 'darkgreen',
        tension: 0.1
      }]
    },
    options: {
      scales: {
        x: { type: 'linear', title: { display: true, text: 'Distance (km)' } },
        y: { title: { display: true, text: 'Elevation (m)' } }
      }
    }
  });
}

function renderSegments() {
  const container = document.getElementById('segments');
  container.innerHTML = '';
  const goalTime = parseFloat(document.getElementById('goalTime').value);

  const segments = [];
  for (let i = 1; i < aidStations.length; i++) {
    const prev = aidStations[i - 1];
    const curr = aidStations[i];
    const distance = curr.km - prev.km;
    const cutoffDelta = curr.cutoff - prev.cutoff;
    const rest = curr.rest;

    const maxRunTime = cutoffDelta - rest - 1;
    const defaultRunTime = goalTime * (distance / 326);
    const runTime = Math.min(defaultRunTime, maxRunTime);

    const pace = (distance / runTime).toFixed(2);
    segments.push({ from: prev.name, to: curr.name, distance, runTime, rest, pace });

    const segmentDiv = document.createElement('div');
    segmentDiv.className = 'segment';
    segmentDiv.innerHTML = `
      <strong>${prev.name} → ${curr.name}</strong><br>
      Distance: ${distance} km<br>
      Run time: <input type="number" value="${runTime.toFixed(1)}" step="0.5" id="rt${i}" /> h<br>
      Rest time: <input type="number" value="${rest}" step="0.5" id="rest${i}" /> h<br>
      Target pace: ${pace} km/h
    `;
    container.appendChild(segmentDiv);
  }
}

function recalculatePlan() {
  aidStations[1].rest = parseFloat(document.getElementById('rest1')?.value || 1);
  aidStations[2].rest = parseFloat(document.getElementById('rest2')?.value || 2);
  aidStations[3].rest = parseFloat(document.getElementById('rest3')?.value || 3);
  renderSegments();
}

async function main() {
  const geojson = await loadGPX('nuts300.gpx');
  initMap(geojson);
  buildElevationChart(geojson);
  renderSegments();
}

main();
