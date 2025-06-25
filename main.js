import { gpx } from './togeojson.js';

const aidStations = [
  { name: "Start (Njurkulahti)", km: 0, cutoff: "Mon 12:00", rest: 0 },
  { name: "Kalmakaltio", km: 88, cutoff: "Tue 12:00", rest: 1 },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00", rest: 2 },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00", rest: 3 },
  { name: "Rauhala", km: 277, cutoff: null, rest: 0 },
  { name: "Pahtavuoma", km: 288, cutoff: null, rest: 0 },
  { name: "Peurakaltio", km: 301, cutoff: null, rest: 0 },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00", rest: 0 }
];

let routeCoords = [];

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const gpxRes = await fetch("nuts300.gpx");
    const gpxText = await gpxRes.text();
    const parser = new DOMParser();
    const gpxDom = parser.parseFromString(gpxText, "application/xml");
    const geojson = gpx(gpxDom);

    routeCoords = geojson.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
    initMap(routeCoords);
    renderElevationChart(routeCoords);
    renderPlanner();
    document.getElementById("recalculate").addEventListener("click", renderPlanner);
  } catch (e) {
    console.error("Error loading GPX:", e);
  }
});

function initMap(coords) {
  const map = L.map("map").setView(coords[0], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const polyline = L.polyline(coords, { color: "blue" }).addTo(map);
  map.fitBounds(polyline.getBounds());

  aidStations.forEach(station => {
    const latlng = getLatLngAtKm(station.km);
    if (latlng) {
      L.marker(latlng).addTo(map).bindPopup(`${station.name} (${station.km} km)`);
    }
  });
}

function getLatLngAtKm(targetKm) {
  let totalDist = 0;
  for (let i = 1; i < routeCoords.length; i++) {
    const [lat1, lon1] = routeCoords[i - 1];
    const [lat2, lon2] = routeCoords[i];
    const d = getDistance(lat1, lon1, lat2, lon2);
    totalDist += d;
    if (totalDist >= targetKm) return [lat2, lon2];
  }
  return routeCoords[routeCoords.length - 1];
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371, toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function renderElevationChart(coords) {
  const el = document.getElementById("elevation");
  const distances = [0];
  let total = 0;

  for (let i = 1; i < coords.length; i++) {
    const d = getDistance(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
    total += d;
    distances.push(total);
  }

  const heights = coords.map(c => c[2] || 0);

  const chart = echarts.init(el);
  chart.setOption({
    xAxis: {
      type: 'category',
      data: distances.map(d => d.toFixed(1)),
      name: 'Distance (km)',
    },
    yAxis: {
      type: 'value',
      name: 'Elevation (m)',
    },
    series: [{
      data: heights,
      type: 'line',
      areaStyle: {},
    }],
    tooltip: {
      trigger: 'axis'
    }
  });
}

function renderPlanner() {
  const table = document.getElementById("planner-table");
  table.innerHTML = "";

  const goalHours = parseFloat(document.getElementById("goalTime").value);
  const totalDistance = aidStations[aidStations.length - 1].km;

  let totalRest = 0;
  aidStations.forEach((s, i) => {
    const restVal = parseFloat(document.getElementById(`rest-${i}`)?.value || s.rest || 0);
    s.rest = restVal;
    totalRest += restVal;
  });

  const movingTime = goalHours - totalRest;
  const movingPace = totalDistance / movingTime;

  let rows = "";
  let totalTime = 0;

  for (let i = 1; i < aidStations.length; i++) {
    const from = aidStations[i - 1];
    const to = aidStations[i];
    const sectionDist = to.km - from.km;
    const time = sectionDist / movingPace;
    const pace = (sectionDist / time).toFixed(2);
    totalTime += time + from.rest;

    rows += `
      <tr>
        <td>${from.name} → ${to.name}</td>
        <td>${sectionDist.toFixed(1)}</td>
        <td>${time.toFixed(1)} h</td>
        <td>${pace} km/h</td>
        <td><input id="rest-${i}" type="number" value="${to.rest || 0}" step="0.1" min="0" style="width:50px" /></td>
        <td>${to.cutoff || "-"}</td>
        <td><input type="text" placeholder="Notes..." style="width:100%" /></td>
      </tr>`;
  }

  rows += `
    <tr style="font-weight:bold; background:#eee">
      <td>Total</td>
      <td>${totalDistance.toFixed(1)}</td>
      <td>${(goalHours).toFixed(1)} h</td>
      <td>${movingPace.toFixed(2)} km/h</td>
      <td>${totalRest.toFixed(1)} h</td>
      <td colspan="2"></td>
    </tr>`;

  table.innerHTML = rows;
}
