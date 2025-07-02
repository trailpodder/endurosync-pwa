let map;
let elevationChart;
let routeLine;

const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: "Thu 12:00", lat: 68.2552, lon: 24.7876 },
  { name: "Kalmankaltio", km: 88, cutoff: "Fri 13:00", lat: 68.4123, lon: 23.5801 },
  { name: "Hetta", km: 192, cutoff: "Sat 19:00", lat: 68.3839, lon: 23.6333 },
  { name: "Pallas", km: 256, cutoff: "Sun 11:00", lat: 68.0401, lon: 24.0701 },
  { name: "Rauhala (water)", km: 277, cutoff: "", lat: 67.9546, lon: 24.2311 },
  { name: "Pahtavuoma (water)", km: 288, cutoff: "", lat: 67.9017, lon: 24.3749 },
  { name: "Peurakaltio (water)", km: 301, cutoff: "", lat: 67.8428, lon: 24.4641 },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Mon 06:00", lat: 67.6410, lon: 24.1466 }
];

const restTimes = [1, 2, 3]; // Default rest in hours per segment

async function loadGPX(url) {
  const res = await fetch(url);
  const text = await res.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'text/xml');
  const geojson = togeojson.gpx(xml);
  return geojson;
}

function formatTime(hours) {
  const totalMinutes = Math.round(hours * 60);
  const days = Math.floor(totalMinutes / 1440);
  const hrs = Math.floor((totalMinutes % 1440) / 60);
  const mins = totalMinutes % 60;
  return `${days > 0 ? `Day ${days} ` : ''}${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function estimateArrivalTimes() {
  let goalHours = parseFloat(document.getElementById("goalTime").value) || 96;
  let totalDistance = aidStations[aidStations.length - 1].km;

  let pace = (goalHours - restTimes.reduce((a, b) => a + b, 0)) / totalDistance;

  let currentTime = 0;
  let tableRows = aidStations.map((as, i) => {
    let arrival = currentTime;
    let rest = i === 0 ? 0 : (restTimes[i - 1] || 0);
    let departure = arrival + rest;
    let dist = i === 0 ? 0 : as.km - aidStations[i - 1].km;
    currentTime = departure + dist * pace;

    return `
      <tr>
        <td>${as.name}</td>
        <td>${as.km.toFixed(1)} km</td>
        <td>${formatTime(arrival)}</td>
        <td>${formatTime(departure)}</td>
        <td>${as.cutoff}</td>
      </tr>
    `;
  }).join("");

  document.getElementById("paceTableBody").innerHTML = tableRows;
}

async function initMap() {
  map = L.map('map').setView([68.0, 24.0], 8);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18
  }).addTo(map);

  // Load GPX
  const geojson = await loadGPX("nuts300.gpx");
  routeLine = L.geoJSON(geojson, {
    style: { color: 'red', weight: 3 }
  }).addTo(map);

  map.fitBounds(routeLine.getBounds());

  // Add aid station markers
  aidStations.forEach((as, i) => {
    L.marker([as.lat, as.lon]).addTo(map).bindPopup(`${as.name}<br>${as.km} km`);
  });

  // Elevation profile
  const elevation = geojson.features[0].geometry.coordinates.map(c => c[2]);
  const labels = geojson.features[0].geometry.coordinates.map((_, i) => i);

  const ctx = document.getElementById('elevationChart').getContext('2d');
  elevationChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
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
        x: { display: false },
        y: { beginAtZero: false }
      }
    }
  });

  estimateArrivalTimes();
}

document.getElementById("goalTime").addEventListener("input", estimateArrivalTimes);

initMap();
