async function loadGPX(url) {
  const res = await fetch(url);
  const text = await res.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'application/xml');
  const geojson = togeojson.gpx(xml);
  return geojson;
}

const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, lat: 68.3951, lon: 24.5735, cutoff: "Thu 06:00" },
  { name: "Kalmankaltio", km: 88, lat: 68.3877, lon: 23.5931, cutoff: "Thu 23:00" },
  { name: "Hetta", km: 192, lat: 68.3837, lon: 23.6342, cutoff: "Sat 00:00" },
  { name: "Pallas", km: 256, lat: 68.0647, lon: 24.0694, cutoff: "Sat 18:00" },
  { name: "Rauhala", km: 277, lat: 67.9975, lon: 24.2139, cutoff: "Sun 00:00" },
  { name: "Pahtavuoma", km: 288, lat: 67.9508, lon: 24.2662, cutoff: "Sun 03:00" },
  { name: "Peurakaltio", km: 301, lat: 67.8783, lon: 24.2953, cutoff: "Sun 07:00" },
  { name: "Finish (Äkäslompolo)", km: 326, lat: 67.6306, lon: 24.1491, cutoff: "Sun 12:00" }
];

let map, routeLine;

async function initMap() {
  map = L.map('map').setView([68.1, 24.0], 8);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
  }).addTo(map);

  const geojson = await loadGPX('nuts300.gpx');

  routeLine = L.geoJSON(geojson, {
    style: { color: 'blue', weight: 3 }
  }).addTo(map);

  aidStations.forEach(station => {
    const marker = L.marker([station.lat, station.lon])
      .addTo(map)
      .bindPopup(`${station.name}<br>${station.km} km<br>Cutoff: ${station.cutoff}`);
    if (station.km === 0 || station.km === 326) {
      marker.setIcon(L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-red.png', iconSize: [25, 41], iconAnchor: [12, 41] }));
    }
  });

  recalculatePlan();
}

function recalculatePlan() {
  const goalHours = parseFloat(document.getElementById('goalTime').value);
  const totalDistance = 326;
  const pace = goalHours / totalDistance;

  let html = `
    <tr><th>Segment</th><th>Distance (km)</th><th>Pace (h/km)</th><th>Time (hh:mm)</th><th>Arrival</th><th>Cutoff</th></tr>
  `;

  let totalTime = 0;
  for (let i = 1; i < aidStations.length; i++) {
    const prev = aidStations[i - 1];
    const curr = aidStations[i];
    const segmentDist = curr.km - prev.km;
    const segmentTime = segmentDist * pace;
    totalTime += segmentTime;

    const arrivalHour = 6 + totalTime; // starts Thu 06:00
    const arrival = new Date(2025, 6, 3, 6, 0); // July 3, 2025 06:00
    arrival.setHours(arrival.getHours() + totalTime);

    html += `
      <tr>
        <td>${prev.name} → ${curr.name}</td>
        <td>${segmentDist.toFixed(1)}</td>
        <td>${pace.toFixed(2)}</td>
        <td>${segmentTime.toFixed(1)}</td>
        <td>${arrival.toLocaleString('fi-FI', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</td>
        <td>${curr.cutoff}</td>
      </tr>
    `;
  }

  document.getElementById('pacePlan').innerHTML = html;
  document.getElementById('summary').innerHTML = `<strong>Estimated Finish Time:</strong> ${(6 + totalTime).toFixed(1)}h from start`;
}

initMap();
