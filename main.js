import * as L from "https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js";
import { Line } from "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.esm.min.js";

// Aid stations (excluding water-only points)
const aidStations = [
  { name: "Start (Njurgulahti)", distance: 0, cutoff: "Mon 12:00" },
  { name: "Kalmankaltio", distance: 88, cutoff: "Tue 12:00" },
  { name: "Hetta", distance: 192, cutoff: "Thu 13:00" },
  { name: "Pallas", distance: 256, cutoff: "Fri 13:00" },
  { name: "Finish (Äkäslompolo)", distance: 326, cutoff: "Sat 18:00" },
];

// Default values
let goalTime = 96; // hours
let restTimes = [1, 2, 3]; // hours at each aid station (except start/finish)

// Store chart globally for redraw
let paceChart = null;

async function loadGPX() {
  const response = await fetch("nuts300.gpx");
  const gpxText = await response.text();

  const parser = new DOMParser();
  const xml = parser.parseFromString(gpxText, "application/xml");

  const geojson = togeojson.gpx(xml);
  return geojson;
}

function formatTime(hours) {
  const days = Math.floor(hours / 24);
  const h = Math.floor(hours % 24);
  const m = Math.round((hours % 1) * 60);
  return `+${days}d ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function recalculatePlan() {
  const rest0 = parseFloat(document.getElementById("rest0").value) || 0;
  const rest1 = parseFloat(document.getElementById("rest1").value) || 0;
  const rest2 = parseFloat(document.getElementById("rest2").value) || 0;
  const rests = [rest0, rest1, rest2];

  goalTime = parseFloat(document.getElementById("goalTime").value) || 96;

  const segmentDistances = [88, 104, 64, 70];
  const totalDistance = 326;

  const totalRest = rests.reduce((a, b) => a + b, 0);
  const runTime = goalTime - totalRest;

  // Adjust paces so that each segment hits target arrival before cutoff minus rest and margin
  const margin = 1;
  const cutoffs = [24, 73, 97, 126];
  let cumulativeTime = 0;
  let dataLabels = [];
  let dataSpeeds = [];

  let tableBody = document.getElementById("planTable");
  tableBody.innerHTML = "";

  for (let i = 0; i < segmentDistances.length; i++) {
    const cutoff = cutoffs[i];
    const segmentRest = rests[i] || 0;
    const maxAllowedTime = cutoff - cumulativeTime - margin - segmentRest;
    const pace = segmentDistances[i] / maxAllowedTime;
    const time = segmentDistances[i] / pace;

    const arrival = cumulativeTime + time;
    const dep = arrival + segmentRest;
    cumulativeTime = dep;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${aidStations[i].name} → ${aidStations[i + 1].name}</td>
      <td>${segmentDistances[i].toFixed(1)} km</td>
      <td>${time.toFixed(2)} h</td>
      <td>${(segmentDistances[i] / time).toFixed(2)} km/h</td>
      <td>${aidStations[i + 1].cutoff}</td>
    `;
    tableBody.appendChild(row);

    dataLabels.push(`${aidStations[i].name} → ${aidStations[i + 1].name}`);
    dataSpeeds.push((segmentDistances[i] / time).toFixed(2));
  }

  document.getElementById("totalTime").innerText = cumulativeTime.toFixed(2);

  // Update chart
  if (paceChart) paceChart.destroy();
  const ctx = document.getElementById("paceChart").getContext("2d");
  paceChart = new Line(ctx, {
    data: {
      labels: dataLabels,
      datasets: [{
        label: "Segment Speed (km/h)",
        data: dataSpeeds,
        fill: false,
        borderColor: "orange",
        tension: 0.1,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "km/h" }
        }
      }
    }
  });
}

async function initMap() {
  const map = L.map("map").setView([68.5, 22.5], 8);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  const geojson = await loadGPX();
  const gpxLayer = L.geoJSON(geojson, { style: { color: "blue" } }).addTo(map);
  map.fitBounds(gpxLayer.getBounds());

  // Add aid station markers
  aidStations.forEach((s) => {
    const label = `${s.name}\nCutoff: ${s.cutoff}`;
    const marker = L.marker([0, 0], { title: label }).bindPopup(label);
    marker.addTo(map);
  });

  recalculatePlan();
}

// Wire up inputs
document.getElementById("goalTime").addEventListener("input", recalculatePlan);
["rest0", "rest1", "rest2"].forEach(id =>
  document.getElementById(id).addEventListener("input", recalculatePlan)
);

initMap();
