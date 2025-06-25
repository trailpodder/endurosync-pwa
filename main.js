// main.js

let map;
let elevationChart;

const aidStations = [
  { name: "Start: Njurgulahti", km: 0, cutoff: "Monday 12:00" },
  { name: "Kalmankaltio", km: 88, cutoff: "Tuesday 12:00" },
  { name: "Hetta", km: 192, cutoff: "Wednesday 12:00" },
  { name: "Pallas", km: 256, cutoff: "Thursday 00:00" },
  { name: "Rauhala (water only)", km: 277 },
  { name: "Pahtavuoma (water only)", km: 288 },
  { name: "Peurakaltio (water only)", km: 301 },
  { name: "Finish: Äkäslompolo", km: 326, cutoff: "Friday 06:00" }
];

const cutoffTimes = {
  "Kalmankaltio": 24,
  "Hetta": 48,
  "Pallas": 60,
  "Finish: Äkäslompolo": 90
};

function loadGPX() {
  fetch('nuts300.gpx')
    .then(response => response.text())
    .then(gpxText => {
      const parser = new DOMParser();
      const gpxDoc = parser.parseFromString(gpxText, 'application/xml');
      const geojson = toGeoJSON.gpx(gpxDoc);
      displayMap(geojson);
      displayElevation(geojson);
    })
    .catch(error => console.error("Error loading GPX:", error));
}

function displayMap(geojson) {
  map = L.map('map').setView([68.0, 22.5], 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
  }).addTo(map);

  const route = L.geoJSON(geojson).addTo(map);
  map.fitBounds(route.getBounds());

  aidStations.forEach(station => {
    const point = findPointAtDistance(geojson, station.km);
    if (point) {
      L.marker([point[1], point[0]]).addTo(map).bindPopup(`${station.name} (${station.km} km)`);
    }
  });
}

function displayElevation(geojson) {
  const distances = [];
  const elevations = [];
  let totalDist = 0;

  const coords = geojson.features[0].geometry.coordinates;
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1, ele1] = coords[i - 1];
    const [lon2, lat2, ele2] = coords[i];
    const d = haversine(lat1, lon1, lat2, lon2);
    totalDist += d;
    distances.push(totalDist);
    elevations.push(ele2);
  }

  const chart = echarts.init(document.getElementById('elevation'));
  const option = {
    tooltip: {},
    xAxis: {
      type: 'category',
      data: distances.map(d => d.toFixed(1)),
      name: 'km'
    },
    yAxis: {
      type: 'value',
      name: 'Elevation (m)'
    },
    series: [{
      type: 'line',
      data: elevations,
      smooth: true
    }]
  };
  chart.setOption(option);
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findPointAtDistance(geojson, targetKm) {
  const coords = geojson.features[0].geometry.coordinates;
  let dist = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = haversine(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]);
    dist += d;
    if (dist >= targetKm) {
      return coords[i];
    }
  }
  return null;
}

function calculatePlan() {
  const goalHours = parseFloat(document.getElementById('goalTime').value);
  const restInputs = document.querySelectorAll('.restTime');

  let totalRest = 0;
  const rests = [];
  restInputs.forEach(input => {
    const val = parseFloat(input.value) || 0;
    rests.push(val);
    totalRest += val;
  });

  const movingTime = goalHours - totalRest;

  const sections = [];
  for (let i = 0; i < aidStations.length - 1; i++) {
    const from = aidStations[i];
    const to = aidStations[i + 1];
    const dist = to.km - from.km;
    sections.push({
      from: from.name,
      to: to.name,
      dist,
      rest: rests[i + 1] || 0,
      cutoff: cutoffTimes[to.name] || null
    });
  }

  const totalDistance = sections.reduce((s, sec) => s + sec.dist, 0);
  let cumulativeTime = 0;

  sections.forEach(sec => {
    const runTime = movingTime * (sec.dist / totalDistance);
    sec.time = runTime;
    sec.cumulative = cumulativeTime + runTime;
    cumulativeTime += runTime + sec.rest;

    if (sec.cutoff && sec.cumulative + 1 > sec.cutoff) {
      sec.warning = true;
    }

    sec.pace = sec.dist / runTime;
  });

  renderPlan(sections, goalHours, totalDistance);
}

function renderPlan(sections, totalHours, totalKm) {
  const tbody = document.getElementById('planBody');
  tbody.innerHTML = '';
  sections.forEach((sec, i) => {
    const tr = document.createElement('tr');
    if (sec.warning) tr.style.background = '#fcc';
    tr.innerHTML = `
      <td>${sec.from} → ${sec.to}</td>
      <td>${sec.dist.toFixed(1)} km</td>
      <td>${sec.time.toFixed(2)} h</td>
      <td>${sec.pace.toFixed(2)} km/h</td>
      <td><input class="restTime" type="number" value="${sec.rest}" min="0" step="0.25"></td>
      <td>${sec.cutoff ? sec.cutoff + 'h' : ''}</td>
    `;
    tbody.appendChild(tr);
  });

  const footer = document.getElementById('planFooter');
  footer.innerHTML = `
    <td><strong>Total</strong></td>
    <td>${totalKm.toFixed(1)} km</td>
    <td>${totalHours.toFixed(2)} h</td>
    <td></td>
    <td></td>
    <td></td>
  `;
}

document.getElementById('recalculate').addEventListener('click', calculatePlan);

window.addEventListener('load', () => {
  loadGPX();
  calculatePlan();
});
