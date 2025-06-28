import * as toGeoJSON from './togeojson.umd.js';

import L from "https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";

const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00" },
  { name: "Kalmankaltio", km: 88, cutoff: "Tue 12:00" },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00" },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00" },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00" }
];

const defaultRest = [0, 1, 2, 3]; // hrs at each aid station (excluding start)

let chart, map;

async function setupPlanner() {
  const goalTime = parseFloat(document.getElementById("goalTime").value);

  const segments = [];
  for (let i = 1; i < aidStations.length; i++) {
    const prev = aidStations[i - 1];
    const curr = aidStations[i];
    const dist = curr.km - prev.km;
    const rest = defaultRest[i - 1];

    // Define cutoffs in hours since start
    const cutoffHours = [0, 24, 73, 97, 126][i];
    const maxRun = cutoffHours - 1 - rest;
    segments.push({
      segment: `${prev.name} → ${curr.name}`,
      distance: dist,
      runTime: maxRun,
      rest: rest,
      pace: (dist / maxRun).toFixed(2),
      arrival: cutoffHours - 1 - rest,
      cutoff: aidStations[i].cutoff
    });
  }

  // Populate table
  const tbody = document.getElementById("planTableBody");
  tbody.innerHTML = "";
  let totalRun = 0, totalRest = 0, totalDist = 0;
  segments.forEach(seg => {
    totalRun += seg.runTime;
    totalRest += seg.rest;
    totalDist += seg.distance;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${seg.segment}</td>
      <td>${seg.distance.toFixed(1)}</td>
      <td>${seg.runTime.toFixed(2)}</td>
      <td><input class="rest-time" value="${seg.rest}" /></td>
      <td>${seg.pace}</td>
      <td>~${seg.arrival.toFixed(1)}h</td>
      <td>${seg.cutoff}</td>
    `;
    tbody.appendChild(row);
  });
  document.getElementById("totalDistance").innerText = totalDist.toFixed(1);
  document.getElementById("totalRunTime").innerText = totalRun.toFixed(2);
  document.getElementById("totalRestTime").innerText = totalRest.toFixed(2);

  // Load GPX and draw map/chart
  if (!map) {
    map = L.map('map').setView([68.3, 23.6], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  }

  const res = await fetch("route.gpx");
  const gpxText = await res.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(gpxText, "application/xml");
  const geojson = toGeoJSON.gpx(xml);

  const line = L.geoJSON(geojson, { style: { color: "blue" } }).addTo(map);
  map.fitBounds(line.getBounds());

  aidStations.forEach(pt => {
    L.marker([0, 0], { title: pt.name }).addTo(map); // Replace [0,0] with actual coords if available
  });

  const elevations = geojson.features[0].geometry.coordinates.map((c, i) => ({
    x: i, y: c[2]
  }));

  if (chart) chart.destroy();
  const ctx = document.getElementById('chart').getContext('2d');
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: elevations.map(e => e.x),
      datasets: [{
        label: "Elevation (m)",
        data: elevations,
        fill: false,
        borderColor: "green"
      }]
    }
  });
}

setupPlanner();
