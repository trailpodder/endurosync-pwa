import { gpx } from './togeojson.js';

let map, chart, gpxLine = null;
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

init();

async function init() {
  map = L.map('map').setView([68.0, 23.5], 7);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  chart = echarts.init(document.getElementById('chart'));

  try {
    const response = await fetch('nuts300.gpx');
    const gpxText = await response.text();
    const gpxDom = new DOMParser().parseFromString(gpxText, 'text/xml');
    const geojson = gpx(gpxDom);

    gpxLine = geojson.features.find(f => f.geometry.type === 'LineString');
    const latlngs = gpxLine.geometry.coordinates.map(([lon, lat]) => [lat, lon]);

    const route = L.polyline(latlngs, { color: 'blue' }).addTo(map);
    map.fitBounds(route.getBounds());

    aidStations.forEach(station => {
      const latlng = getLatLngAtKm(latlngs, station.km);
      if (latlng) {
        L.marker(latlng).addTo(map).bindPopup(`${station.name} (${station.km} km)`);
      }
    });

    drawElevationChart(geojson);
    recalculatePlan();
  } catch (error) {
    console.error("Error loading GPX:", error);
  }
}

function getLatLngAtKm(latlngs, targetKm) {
  let total = 0;
  for (let i = 1; i < latlngs.length; i++) {
    const d = map.distance(latlngs[i - 1], latlngs[i]) / 1000;
    total += d;
    if (total >= targetKm) return latlngs[i];
  }
  return null;
}

function drawElevationChart(geojson) {
  const coords = gpxLine.geometry.coordinates;
  let totalDistance = 0;
  const distances = [0];
  const elevations = [coords[0][2] || 0];

  for (let i = 1; i < coords.length; i++) {
    const d = distance(coords[i - 1], coords[i]);
    totalDistance += d;
    distances.push(totalDistance);
    elevations.push(coords[i][2] || elevations[elevations.length - 1]);
  }

  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: distances.map(d => d.toFixed(1)) },
    yAxis: { type: 'value', name: 'Elevation (m)' },
    series: [{ type: 'line', data: elevations }]
  });
}

function distance(coord1, coord2) {
  const R = 6371;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(coord2[1] - coord1[1]);
  const dLon = toRad(coord2[0] - coord1[0]);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(coord1[1])) * Math.cos(toRad(coord2[1])) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

window.recalculatePlan = function () {
  const goalHours = parseFloat(document.getElementById("goalTime").value);
  const totalDistance = aidStations[aidStations.length - 1].km;
  const totalRest = aidStations.reduce((sum, s, i) => {
    const input = document.querySelector(`#rest-${i}`);
    s.rest = input ? parseFloat(input.value) : s.rest;
    return sum + s.rest;
  }, 0);
  const movingTime = goalHours - totalRest;
  const pace = totalDistance / movingTime;

  const tbody = document.querySelector("#planTable tbody");
  tbody.innerHTML = "";
  let totalTime = 0;

  for (let i = 0; i < aidStations.length - 1; i++) {
    const from = aidStations[i];
    const to = aidStations[i + 1];
    const sectionDist = to.km - from.km;
    const sectionTime = sectionDist / pace;
    totalTime += sectionTime;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${from.name}</td>
      <td>${to.name}</td>
      <td>${sectionDist.toFixed(1)}</td>
      <td>${formatTime(sectionTime)}</td>
      <td>${pace.toFixed(2)}</td>
      <td><input type="number" id="rest-${i + 1}" value="${to.rest}" step="0.25"></td>
    `;
    tbody.appendChild(row);
  }

  document.getElementById("totalDistance").textContent = totalDistance.toFixed(1);
  document.getElementById("totalTime").textContent = formatTime(totalTime + totalRest);
}

function formatTime(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}min`;
}
