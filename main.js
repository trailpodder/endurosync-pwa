const aidStations = [
  { name: 'Start (Njurgulahti)', km: 0, lat: 68.4509, lon: 24.7294 },
  { name: 'Kalmankaltio', km: 88, lat: 68.3651, lon: 23.6346 },
  { name: 'Hetta', km: 192, lat: 68.3833, lon: 23.6167 },
  { name: 'Pallas', km: 256, lat: 68.0297, lon: 24.0767 },
  { name: 'Rauhala', km: 277, lat: 67.9650, lon: 24.2536 },
  { name: 'Pahtavuoma', km: 288, lat: 67.9186, lon: 24.3308 },
  { name: 'Peurakaltio', km: 301, lat: 67.8646, lon: 24.4175 },
  { name: 'Finish (Äkäslompolo)', km: 326, lat: 67.6026, lon: 24.1495 }
];

async function loadGPX(url) {
  const response = await fetch(url);
  const text = await response.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'application/xml');
  const geojson = togeojson.gpx(xml);
  return geojson;
}

async function init() {
  const map = L.map('map').setView([68.2, 24.0], 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  const data = await loadGPX('nuts300.gpx');
  const coords = [];

  data.features.forEach(f => {
    f.geometry.coordinates.forEach(c => {
      coords.push([c[1], c[0]]);
    });
  });

  const line = L.polyline(coords, { color: 'blue' }).addTo(map);
  map.fitBounds(line.getBounds());

  aidStations.forEach(station => {
    L.marker([station.lat, station.lon])
      .addTo(map)
      .bindPopup(`${station.name} (${station.km} km)`);
  });

  // Elevation chart
  const elevation = data.features.flatMap(f =>
    f.geometry.coordinates.map(c => c[2])
  );

  const dist = Array.from({ length: elevation.length }, (_, i) => i * 0.1); // Dummy distance

  const ctx = document.getElementById('chart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: dist,
      datasets: [{
        label: 'Elevation (m)',
        data: elevation,
        borderColor: 'green',
        borderWidth: 1,
        pointRadius: 0
      }]
    },
    options: {
      scales: {
        x: { display: true, title: { display: true, text: 'Distance (km)' } },
        y: { display: true, title: { display: true, text: 'Elevation (m)' } }
      }
    }
  });
}

init();
