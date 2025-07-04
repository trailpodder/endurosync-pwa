// main.js

let map;
let routeLine;
let elevationData = [];
let elevationChart;
let gpxGeojson;

const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00" },
  { name: "Kalmankaltio", km: 88, cutoff: "Tue 12:00" },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00" },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00" },
  { name: "Rauhala (water)", km: 277, cutoff: "" },
  { name: "Pahtavuoma (water)", km: 288, cutoff: "" },
  { name: "Peurakaltio (water)", km: 301, cutoff: "" },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00" }
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

function getLatLngAtKm(geojson, targetKm) {
  let total = 0;
  const coords = geojson.features[0].geometry.coordinates;

  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    const segmentKm = turf.distance([lon1, lat1], [lon2, lat2]);
    total += segmentKm;
    if (total >= targetKm) {
      return [(lat1 + lat2) / 2, (lon1 + lon2) / 2];
    }
  }
  const [lonLast, latLast] = coords[coords.length - 1];
  return [latLast, lonLast];
}

async function initMap() {
  map = L.map("map").setView([68.3, 24.0], 8);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18
  }).addTo(map);

  gpxGeojson = await loadGPX("nuts300.gpx");
  routeLine = L.geoJSON(gpxGeojson, {
    style: { color: "blue" }
  }).addTo(map);
  map.fitBounds(routeLine.getBounds());

  aidStations.forEach(station => {
    const [lat, lon] = getLatLngAtKm(gpxGeojson, station.km);
    L.marker([lat, lon])
      .addTo(map)
      .bindPopup(`<b>${station.name}</b><br>${station.km} km<br>Cutoff: ${station.cutoff || "-"}`);
  });

  const goalHours = parseInt(document.getElementById("goal-time").value) || 96;
  const restTimes = aidStations.slice(1).map(() => 1);
  const etas = calculateETAs(goalHours, restTimes);
  updateTable(etas);
}

document.getElementById("goal-time").addEventListener("change", recalculate);

initMap();
