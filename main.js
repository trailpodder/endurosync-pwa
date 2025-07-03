// main.js

let map;
let routeLine;
let elevationData = [];
let elevationChart;

const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, lat: 68.47411, lon: 24.73367, cutoff: "Mon 12:00" },
  { name: "Kalmankaltio", km: 88, lat: 68.47867, lon: 23.90687, cutoff: "Tue 12:00" },
  { name: "Hetta", km: 192, lat: 68.38395, lon: 23.63358, cutoff: "Thu 13:00" },
  { name: "Pallas", km: 256, lat: 68.37033, lon: 24.06020, cutoff: "Fri 13:00" },
  { name: "Rauhala (water)", km: 277, lat: 68.32613, lon: 24.30588, cutoff: "" },
  { name: "Pahtavuoma (water)", km: 288, lat: 68.29177, lon: 24.42892, cutoff: "" },
  { name: "Peurakaltio (water)", km: 301, lat: 68.25903, lon: 24.57178, cutoff: "" },
  { name: "Finish (Äkäslompolo)", km: 326, lat: 67.59184, lon: 24.15078, cutoff: "Sat 18:00" }
];

function loadGPX(url) {
  return fetch(url)
    .then(res => res.text())
    .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
    .then(gpx => togeojson.gpx(gpx));
}

function formatTime(minutes) {
  const base = new Date("2025-07-14T12:00:00Z");
  const t = new Date(base.getTime() + minutes * 60000);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[t.getUTCDay()]} ${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`;
}

function calculateETAs(goalHours, restTimes) {
  const result = [];
  const totalDistance = aidStations[aidStations.length - 1].km;
  let time = 0;

  for (let i = 0; i < aidStations.length; i++) {
    const current = aidStations[i];
    const prev = aidStations[i - 1];

    if (i === 0) {
      result.push({
        name: current.name,
        etaIn: 0,
        etaOut: 0,
        cutoff: current.cutoff
      });
    } else {
      const segmentDist = current.km - prev.km;
      const pace = goalHours * 60 / totalDistance;
      const segmentTime = pace * segmentDist;
      const rest = parseInt(restTimes[i - 1]) || 0;
      time += segmentTime;
      const etaIn = time;
      time += rest;
      const etaOut = time;
      result.push({
        name: current.name,
        etaIn,
        etaOut,
        cutoff: current.cutoff
      });
    }
  }
  return result;
}

function updateTable(etas) {
  const table = document.getElementById("pace-table");
  table.innerHTML = "";
  const header = table.insertRow();
  ["Aid Station", "ETA In", "ETA Out", "Cutoff", "Rest (h)"].forEach(t => header.insertCell().textContent = t);

  etas.forEach((row, i) => {
    const tr = table.insertRow();
    tr.insertCell().textContent = row.name;
    tr.insertCell().textContent = formatTime(row.etaIn);
    tr.insertCell().textContent = formatTime(row.etaOut);
    tr.insertCell().textContent = row.cutoff;
    if (i > 0) {
      const input = document.createElement("input");
      input.type = "number";
      input.value = "1";
      input.min = 0;
      input.oninput = () => recalculate();
      tr.insertCell().appendChild(input);
    } else {
      tr.insertCell().textContent = "-";
    }
  });
}

function recalculate() {
  const goalHours = parseInt(document.getElementById("goal-time").value) || 96;
  const table = document.getElementById("pace-table");
  const restTimes = [];
  for (let i = 1; i < table.rows.length; i++) {
    const input = table.rows[i].cells[4].querySelector("input");
    restTimes.push(input ? input.value : 0);
  }
  const etas = calculateETAs(goalHours, restTimes);
  updateTable(etas);
}

async function initMap() {
  map = L.map("map").setView([68.3, 24.0], 8);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18
  }).addTo(map);

  const geojson = await loadGPX("nuts300.gpx");
  routeLine = L.geoJSON(geojson, {
    style: { color: "blue" }
  }).addTo(map);
  map.fitBounds(routeLine.getBounds());

  aidStations.forEach(aid => {
    L.marker([aid.lat, aid.lon])
      .addTo(map)
      .bindPopup(`<b>${aid.name}</b><br>${aid.km} km<br>Cutoff: ${aid.cutoff || "-"}`);
  });

  const goalHours = parseInt(document.getElementById("goal-time").value) || 96;
  const restTimes = aidStations.slice(1).map(() => 1);
  const etas = calculateETAs(goalHours, restTimes);
  updateTable(etas);
}

document.getElementById("goal-time").addEventListener("change", recalculate);

initMap();
