let map = L.map('map').setView([68.3, 23.5], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
}).addTo(map);

const chartCtx = document.getElementById('chart').getContext('2d');
let elevationChart;

document.getElementById('gpxFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const text = await file.text();
  const parser = new DOMParser();
  const gpxDoc = parser.parseFromString(text, "application/xml");
  const geojson = toGeoJSON.gpx(gpxDoc);
  const line = L.geoJSON(geojson).addTo(map);
  map.fitBounds(line.getBounds());

  const coords = geojson.features[0].geometry.coordinates;
  const elevation = coords.map(c => c[2] || 0);
  const dist = coords.map((c, i) => i * 0.1);
  if (elevationChart) elevationChart.destroy();
  elevationChart = new Chart(chartCtx, {
    type: 'line',
    data: {
      labels: dist,
      datasets: [{ label: 'Elevation (m)', data: elevation, borderColor: 'blue' }]
    }
  });
});
