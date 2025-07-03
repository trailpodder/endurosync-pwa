const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00", lat: 68.5372, lon: 24.1235, rest: 0 },
  { name: "Kalmankaltio", km: 88, cutoff: "Tue 12:00", lat: 68.3166, lon: 23.6953, rest: 1 },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00", lat: 68.3832, lon: 23.6150, rest: 2 },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00", lat: 68.0664, lon: 24.0700, rest: 2 },
  { name: "Rauhala", km: 277, cutoff: "", lat: 67.9830, lon: 24.1990, rest: 0 },
  { name: "Pahtavuoma", km: 288, cutoff: "", lat: 67.9380, lon: 24.3050, rest: 0 },
  { name: "Peurakaltio", km: 301, cutoff: "", lat: 67.8880, lon: 24.3720, rest: 0 },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00", lat: 67.6223, lon: 24.1476, rest: 0 }
];

async function loadGPX() {
  const response = await fetch("nuts300.gpx");
  const text = await response.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "application/xml");
  return togeojson.gpx(xml);
}

function renderAidStations(map) {
  aidStations.forEach(station => {
    L.marker([station.lat, station.lon]).addTo(map)
      .bindPopup(`${station.name}<br>${station.km} km<br>Cutoff: ${station.cutoff}`);
  });
}

function renderTable() {
  const tbody = document.querySelector("#plannerTable tbody");
  tbody.innerHTML = "";

  let currentTime = new Date("2025-08-25T12:00:00"); // Start: Monday 12:00
  const pace = 5; // 5 km/h base

  for (let i = 0; i < aidStations.length; i++) {
    const curr = aidStations[i];
    const prev = aidStations[i - 1] || { km: 0 };
    const dist = curr.km - prev.km;
    const segmentTimeH = dist / pace;
    const etaIn = new Date(currentTime.getTime() + segmentTimeH * 3600 * 1000);
    const etaOut = new Date(etaIn.getTime() + curr.rest * 3600 * 1000);
    currentTime = etaOut;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${curr.name}</td>
      <td>${dist.toFixed(1)}</td>
      <td>${curr.cutoff}</td>
      <td><input type="number" value="${curr.rest}" min="0" max="12" step="0.5" onchange="updateRest(${i}, this.value)" /></td>
      <td>${etaIn.toLocaleString()}</td>
      <td>${etaOut.toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  }
}

function updateRest(index, value) {
  aidStations[index].rest = parseFloat(value);
  renderTable();
}

function drawElevationChart(coords) {
  const ctx = document.getElementById("chart").getContext("2d");
  const dist = [0];
  const elev = [coords[0][2]];
  let totalDist = 0;

  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i - 1][0];
    const dy = coords[i][1] - coords[i - 1][1];
    const dz = coords[i][2];
    totalDist += Math.sqrt(dx * dx + dy * dy) * 111; // rough km estimate
    dist.push(totalDist);
    elev.push(dz);
  }

  new Chart(ctx, {
    type: "line",
    data: {
      labels: dist,
      datasets: [{
        label: "Elevation (m)",
        data: elev,
        borderColor: "blue",
        fill: false,
        tension: 0.1
      }]
    },
    options: {
      scales: {
        x: { title: { display: true, text: "Distance (km)" } },
        y: { title: { display: true, text: "Elevation (m)" } }
      }
    }
  });
}

async function init() {
  const geojson = await loadGPX();
  const coords = geojson.features[0].geometry.coordinates;

  const map = L.map("map").setView([68.2, 24], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  const polyline = coords.map(c => [c[1], c[0]]);
  L.polyline(polyline, { color: "blue" }).addTo(map);

  renderAidStations(map);
  renderTable();
  drawElevationChart(coords);
}

init();
