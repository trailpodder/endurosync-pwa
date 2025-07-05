// main.js
let map;
let routeLine;
let gpxGeojson;

const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00", pacing: true },
  { name: "Kalmankaltio", km: 88, cutoff: "Tue 12:00", pacing: true },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00", pacing: true },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00", pacing: true },
  { name: "Rauhala (water)", km: 277, cutoff: "", pacing: false },
  { name: "Pahtavuoma (water)", km: 288, cutoff: "", pacing: false },
  { name: "Peurakaltio (water)", km: 301, cutoff: "", pacing: false },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00", pacing: true }
];

function formatTime(minutes) {
  const base = new Date("2025-07-14T12:00:00Z");
  const t = new Date(base.getTime() + minutes * 60000);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[t.getUTCDay()]} ${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`;
}

function parseCutoff(cutoff) {
  if (!cutoff) return Infinity;
  const [day, time] = cutoff.split(" ");
  const [hour, min] = time.split(":").map(Number);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayOffset = (days.indexOf(day) - 1 + 7) % 7;
  return dayOffset * 1440 + hour * 60 + min;
}

function parseTimeInput(str) {
  if (!str) return null;
  const [day, hm] = str.trim().split(" ");
  const [h, m] = hm.split(":").map(Number);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayOffset = (days.indexOf(day) - 1 + 7) % 7;
  return dayOffset * 1440 + h * 60 + m;
}

function loadGPX(url) {
  return fetch(url)
    .then(res => res.text())
    .then(str => (new DOMParser()).parseFromString(str, "application/xml"))
    .then(data => toGeoJSON.gpx(data));
}

function getLatLngAtKm(geojson, targetKm) {
  let total = 0;
  const coords = geojson.features[0].geometry.coordinates;
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    const dist = turf.distance([lon1, lat1], [lon2, lat2]);
    total += dist;
    if (total >= targetKm) return [(lat1 + lat2) / 2, (lon1 + lon2) / 2];
  }
  return coords.length ? [coords.at(-1)[1], coords.at(-1)[0]] : [0, 0];
}

function calculateETAs(goalHours, etaIns, etaOuts) {
  const pacingStations = aidStations.filter(s => s.pacing);
  const etas = [];
  for (let i = 0; i < pacingStations.length; i++) {
    const etaIn = parseTimeInput(etaIns[i]) ?? (i === 0 ? 0 : etas[i - 1].etaOut);
    const etaOut = parseTimeInput(etaOuts[i]) ?? etaIn;
    const sectionTime = i === 0 ? 0 : etaIn - etas[i - 1].etaOut;
    const pace = i === 0 ? 0 : sectionTime / (pacingStations[i].km - pacingStations[i - 1].km);
    const totalElapsed = etaOut;
    const rest = etaOut - etaIn;
    const cutoff = parseCutoff(pacingStations[i].cutoff);
    etas.push({
      name: pacingStations[i].name,
      etaIn, etaOut, sectionTime, totalElapsed, pace, rest, cutoff,
      exceedsCutoff: etaOut > cutoff
    });
  }
  return etas;
}

function updateTable(etas) {
  const table = document.getElementById("pace-table");
  table.innerHTML = "";
  const header = table.insertRow();
  ["Aid Station", "ETA In", "ETA Out", "Cutoff", "Section Time", "Total Time", "Pace (min/km)", "Rest (min)"].forEach(h => header.insertCell().textContent = h);
  etas.forEach((e, i) => {
    const row = table.insertRow();
    row.insertCell().textContent = e.name;
    const inCell = row.insertCell();
    const inInput = document.createElement("input");
    inInput.value = formatTime(e.etaIn);
    inInput.onchange = recalculate;
    inCell.appendChild(inInput);
    const outCell = row.insertCell();
    const outInput = document.createElement("input");
    outInput.value = formatTime(e.etaOut);
    outInput.onchange = recalculate;
    outCell.appendChild(outInput);
    row.insertCell().textContent = aidStations.find(s => s.name === e.name).cutoff;
    row.insertCell().textContent = e.sectionTime.toFixed(1);
    row.insertCell().textContent = e.totalElapsed.toFixed(1);
    row.insertCell().textContent = e.pace ? (60 / e.pace).toFixed(2) : "-";
    row.insertCell().textContent = e.rest.toFixed(0);
    if (e.exceedsCutoff) row.style.backgroundColor = "#fdd";
  });
}

function recalculate() {
  const rows = document.getElementById("pace-table").rows;
  const etaIns = [], etaOuts = [];
  for (let i = 1; i < rows.length; i++) {
    etaIns.push(rows[i].cells[1].querySelector("input").value);
    etaOuts.push(rows[i].cells[2].querySelector("input").value);
  }
  const goal = parseFloat(document.getElementById("goal-time").value) || 90;
  const etas = calculateETAs(goal, etaIns, etaOuts);
  updateTable(etas);
}

document.getElementById("goal-time").addEventListener("change", recalculate);

async function initMap() {
  map = L.map("map").setView([68.3, 24.0], 8);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
  gpxGeojson = await loadGPX("nuts300.gpx");
  routeLine = L.geoJSON(gpxGeojson, { style: { color: "blue" } }).addTo(map);
  map.fitBounds(routeLine.getBounds());
  aidStations.forEach(s => {
    const [lat, lon] = getLatLngAtKm(gpxGeojson, s.km);
    L.marker([lat, lon]).addTo(map).bindPopup(`${s.name}<br>${s.km} km<br>Cutoff: ${s.cutoff || "-"}`);
  });
  const pacingStations = aidStations.filter(s => s.pacing);
  const etaIns = pacingStations.map((_, i) => formatTime(i * 1000));
  const etaOuts = pacingStations.map((_, i) => formatTime(i * 1000 + 60));
  const etas = calculateETAs(90, etaIns, etaOuts);
  updateTable(etas);
}

initMap();
