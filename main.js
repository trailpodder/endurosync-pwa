let map, chart, geojson, routeLine;

const aidStations = [
  { name: "Njurkulahti", km: 0, cutoff: null },
  { name: "Kalmakaltio", km: 88, cutoff: 24 },
  { name: "Hetta", km: 167, cutoff: 48 },
  { name: "Pallas", km: 226, cutoff: 72 },
  { name: "Finish", km: 326, cutoff: 108 }
];

const gpxUrl = 'nuts300.gpx';

document.addEventListener('DOMContentLoaded', async () => {
  map = L.map('map').setView([68.3, 23.8], 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18
  }).addTo(map);

  chart = echarts.init(document.getElementById('chart'));

  try {
    const gpxResponse = await fetch(gpxUrl);
    const gpxText = await gpxResponse.text();
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxText, 'application/xml');
    geojson = toGeoJSON.gpx(gpxDoc);

    routeLine = L.geoJSON(geojson).addTo(map);
    map.fitBounds(routeLine.getBounds());

    addAidStationMarkers();
    renderElevationChart();
    recalculatePlan();

  } catch (error) {
    console.error("Error loading GPX:", error);
  }
});

function addAidStationMarkers() {
  aidStations.forEach(station => {
    const nearest = findNearestPoint(station.km);
    if (nearest) {
      L.marker([nearest[1], nearest[0]]).addTo(map).bindPopup(`${station.name} (${station.km} km)`);
    }
  });
}

function findNearestPoint(targetKm) {
  if (!geojson || !geojson.features || !geojson.features.length) return null;

  let dist = 0;
  const coords = geojson.features[0].geometry.coordinates;

  for (let i = 1; i < coords.length; i++) {
    const segDist = getDistance(coords[i - 1], coords[i]);
    dist += segDist;
    if (dist >= targetKm * 1000) return coords[i];
  }
  return coords[coords.length - 1];
}

function getDistance(a, b) {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);

  const x = dLon * Math.cos((lat1 + lat2) / 2);
  const y = dLat;
  return Math.sqrt(x * x + y * y) * R;
}

function renderElevationChart() {
  const coords = geojson.features[0].geometry.coordinates;
  const elevations = [];
  let totalDistance = 0;

  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const dist = getDistance(prev, curr);
    totalDistance += dist;
    const ele = geojson.features[0].geometry.coordinates[i][2] || 0;
    elevations.push([totalDistance / 1000, ele]);
  }

  chart.setOption({
    xAxis: { type: 'value', name: 'km' },
    yAxis: { type: 'value', name: 'm' },
    series: [{
      type: 'line',
      data: elevations,
      areaStyle: {}
    }]
  });
}

function recalculatePlan() {
  const goalTime = parseFloat(document.getElementById('goalTime').value);
  const restKalma = parseFloat(document.getElementById('rest-Kalmakaltio').value);
  const restHetta = parseFloat(document.getElementById('rest-Hetta').value);
  const restPallas = parseFloat(document.getElementById('rest-Pallas').value);

  const restTimes = {
    Kalmakaltio: restKalma,
    Hetta: restHetta,
    Pallas: restPallas
  };

  const margin = 1;
  const planBody = document.getElementById('planBody');
  planBody.innerHTML = '';

  let totalRunTime = 0;
  let totalDistance = 0;

  for (let i = 1; i < aidStations.length; i++) {
    const prev = aidStations[i - 1];
    const curr = aidStations[i];
    const sectionDistance = curr.km - prev.km;
    totalDistance += sectionDistance;

    let maxRunTime = (curr.cutoff ?? goalTime) - totalRunTime - (restTimes[curr.name] || 0) - margin;
    maxRunTime = Math.max(1, maxRunTime);

    const pace = sectionDistance / maxRunTime;
    const sectionTime = sectionDistance / pace;
    totalRunTime += sectionTime + (restTimes[curr.name] || 0);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${prev.name} → ${curr.name}</td>
      <td>${sectionDistance.toFixed(1)}</td>
      <td>${formatTime(sectionTime)}</td>
      <td>${pace.toFixed(2)}</td>
      <td>${restTimes[curr.name] || 0}</td>
      <td>${curr.cutoff ?? '-'}</td>
    `;
    planBody.appendChild(row);
  }

  document.getElementById('totalDistance').textContent = totalDistance.toFixed(1);
  document.getElementById('totalTime').textContent = formatTime(totalRunTime);
}

function formatTime(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}
