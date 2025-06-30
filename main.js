import L from "https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js";
import * as togeojson from './togeojson.js';

let map, gpxLayer, windowPaceChart;
const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00" },
  { name: "Kalmankaltio", km: 88, cutoff: "Tue 12:00" },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00" },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00" },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00" },
];

const segmentDefaults = [
  { runTime: 18, rest: 1 },  // Start–Kalmankaltio
  { runTime: 30, rest: 2 },  // Kalmankaltio–Hetta
  { runTime: 19, rest: 3 },  // Hetta–Pallas
  { runTime: 23, rest: 0 }   // Pallas–Finish
];

async function loadGPX(url) {
  const res = await fetch(url);
  const gpxText = await res.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(gpxText, "text/xml");
  const geojson = togeojson.gpx(xml);
  return geojson;
}

function initMap() {
  map = L.map("map").setView([68.3, 23.7], 8);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
}

function plotRoute(geojson) {
  gpxLayer = L.geoJSON(geojson, {
    style: { color: "blue", weight: 3 },
  }).addTo(map);
  map.fitBounds(gpxLayer.getBounds());
}

function plotAidStations() {
  aidStations.forEach((a) => {
    // Just simulate lat/lon for now, should be real
    const lat = 68 + a.km * 0.01;
    const lon = 23.7;
    L.marker([lat, lon]).addTo(map).bindPopup(`${a.name}<br>${a.cutoff}`);
  });
}

function displayPlan() {
  const table = document.getElementById("pace-table");
  if (!table) return;

  table.innerHTML = `<tr>
    <th>Segment</th>
    <th>Distance (km)</th>
    <th>Run Time (h)</th>
    <th>Rest (h)</th>
    <th>Arrival</th>
    <th>Cutoff</th>
  </tr>`;

  let cumulativeTime = new Date("2025-09-01T12:00:00"); // Mon 12:00 start
  for (let i = 0; i < segmentDefaults.length; i++) {
    const s = segmentDefaults[i];
    const from = aidStations[i];
    const to = aidStations[i + 1];
    const distance = to.km - from.km;

    const runTime = s.runTime;
    const rest = s.rest;
    const arrival = new Date(cumulativeTime.getTime() + runTime * 60 * 60 * 1000);
    const departure = new Date(arrival.getTime() + rest * 60 * 60 * 1000);

    table.innerHTML += `<tr>
      <td>${from.name} → ${to.name}</td>
      <td>${distance}</td>
      <td>${runTime}</td>
      <td>${rest}</td>
      <td>${arrival.toUTCString().slice(0, -7)}</td>
      <td>${to.cutoff}</td>
    </tr>`;

    cumulativeTime = departure;
  }

  document.getElementById("goal-time").textContent = `Goal Finish: ${cumulativeTime.toUTCString().slice(0, -7)}`;
}

async function main() {
  initMap();
  const geojson = await loadGPX("nuts300.gpx");
  plotRoute(geojson);
  plotAidStations();
  displayPlan();
}

main();
