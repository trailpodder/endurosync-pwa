let map;

window.addEventListener('load', () => {
  map = L.map('map').setView([68.3, 23.6], 8);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  fetch('nuts300.gpx')
    .then(res => res.text())
    .then(gpxText => {
      const parser = new DOMParser();
      const gpxDoc = parser.parseFromString(gpxText, 'application/xml');
      const geojson = toGeoJSON.gpx(gpxDoc);

      const coordinates = geojson.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
      const gpxLine = L.polyline(coordinates, { color: 'blue' }).addTo(map);
      map.fitBounds(gpxLine.getBounds());

      drawElevationChart(coordinates);

      window.routeCoordinates = coordinates;

      updatePlanner();
    })
    .catch(err => {
      console.error('Error loading GPX:', err);
    });

  document.getElementById('updatePlan').addEventListener('click', updatePlanner);
});

function drawElevationChart(coords) {
  const elevationData = coords.map((c, i) => ({
    value: [i, c[2] || 0]
  }));

  const chart = echarts.init(document.getElementById('elevation'));
  chart.setOption({
    tooltip: {
      trigger: 'axis'
    },
    xAxis: { type: 'category', show: false },
    yAxis: { type: 'value' },
    series: [{
      data: elevationData,
      type: 'line',
      areaStyle: {}
    }]
  });
}

function getLatLngAtKm(route, targetKm) {
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const dist = getDistance(route[i - 1], route[i]);
    if (total + dist >= targetKm) {
      return route[i];
    }
    total += dist;
  }
  return route[route.length - 1];
}

function getDistance(a, b) {
  const R = 6371;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLon = (b[1] - a[1]) * Math.PI / 180;
  const lat1 = a[0] * Math.PI / 180;
  const lat2 = b[0] * Math.PI / 180;

  const x = dLat / 2;
  const y = dLon / 2;

  const aCalc = Math.sin(x) * Math.sin(x) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(y) * Math.sin(y);

  const c = 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));
  return R * c;
}

function updatePlanner() {
  if (!window.routeCoordinates) return;

  const goalHours = parseFloat(document.getElementById('goalHours').value);
  const restKalmakaltio = parseFloat(document.getElementById('stopKalmakaltio').value);
  const restHetta = parseFloat(document.getElementById('stopHetta').value);
  const restPallas = parseFloat(document.getElementById('stopPallas').value);

  const aidStations = [
    { name: "Start (Njurkulahti)", km: 0, cutoff: "Mon 12:00", rest: 0 },
    { name: "Kalmakaltio", km: 88, cutoff: "Tue 12:00", rest: restKalmakaltio },
    { name: "Hetta", km: 192, cutoff: "Thu 13:00", rest: restHetta },
    { name: "Pallas", km: 256, cutoff: "Fri 13:00", rest: restPallas },
    { name: "Rauhala", km: 277, cutoff: null, rest: 0 },
    { name: "Pahtavuoma", km: 288, cutoff: null, rest: 0 },
    { name: "Peurakaltio", km: 301, cutoff: null, rest: 0 },
    { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00", rest: 0 }
  ];

  const totalDistance = aidStations[aidStations.length - 1].km;
  const totalRest = restKalmakaltio + restHetta + restPallas;
  const movingTime = goalHours - totalRest;

  const plannerOutput = document.getElementById('plannerOutput');
  plannerOutput.innerHTML = `
    <h2>Planned Times</h2>
    <table border="1" cellpadding="4">
      <tr><th>Segment</th><th>Distance (km)</th><th>ETA (h)</th><th>Rest (h)</th></tr>
  `;

  let eta = 0;
  for (let i = 1; i < aidStations.length; i++) {
    const prev = aidStations[i - 1];
    const curr = aidStations[i];
    const segmentKm = curr.km - prev.km;
    const segmentTime = (segmentKm / totalDistance) * movingTime;
    eta += segmentTime + prev.rest;

    const marker = L.marker(getLatLngAtKm(window.routeCoordinates, curr.km))
      .addTo(map)
      .bindPopup(`${curr.name}<br>km ${curr.km}<br>ETA: ${eta.toFixed(1)} h`);

    plannerOutput.innerHTML += `
      <tr>
        <td>${prev.name} → ${curr.name}</td>
        <td>${segmentKm}</td>
        <td>${eta.toFixed(1)}</td>
        <td>${prev.rest}</td>
      </tr>
    `;
  }

  plannerOutput.innerHTML += `</table>`;
}
