// main.js

import L from 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet-src.esm.js';
import "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
import "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js";
import "https://cdn.jsdelivr.net/npm/@kurkle/color@0.3.2/dist/color.umd.js";

window.addEventListener("DOMContentLoaded", async () => {
  const map = L.map("map");

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
  }).addTo(map);

  const response = await fetch("nuts300.gpx");
  const gpxText = await response.text();
  const parser = new DOMParser();
  const gpxDoc = parser.parseFromString(gpxText, "application/xml");
  const geojson = toGeoJSON.gpx(gpxDoc);
  const track = L.geoJSON(geojson, {
    style: { color: "#e30613", weight: 4 },
  }).addTo(map);

  map.fitBounds(track.getBounds());

  const aidStations = [
    { name: "Start (Njurgulahti)", km: 0, cutoff: 0, latlng: null },
    { name: "Kalmankaltio", km: 88, cutoff: 24 },
    { name: "Hetta", km: 192, cutoff: 73 },
    { name: "Pallas", km: 256, cutoff: 97 },
    { name: "Finish (Äkäslompolo)", km: 326, cutoff: 126 },
  ];

  const elevations = [];
  const distances = [];
  let totalDistance = 0;

  const coords = geojson.features[0].geometry.coordinates.map(c => L.latLng(c[1], c[0]));
  for (let i = 0; i < coords.length; i++) {
    if (i > 0) totalDistance += coords[i].distanceTo(coords[i - 1]) / 1000;
    distances.push(totalDistance);
    const ele = geojson.features[0].properties.coordTimes ? geojson.features[0].properties.coordTimes[i] : 0;
    elevations.push(geojson.features[0].geometry.coordinates[i][2] || 0);
  }

  const aidCoords = aidStations.map(aid => {
    let nearest = 0;
    let minDiff = Infinity;
    for (let i = 0; i < distances.length; i++) {
      const diff = Math.abs(distances[i] - aid.km);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = i;
      }
    }
    aid.latlng = coords[nearest];
    return aid;
  });

  aidCoords.forEach(aid => {
    if (aid.latlng) {
      L.marker(aid.latlng, { title: aid.name })
        .addTo(map)
        .bindPopup(`<b>${aid.name}</b><br>${aid.km} km`);
    }
  });

  const ctx = document.getElementById("elevationChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: distances.map(d => d.toFixed(1)),
      datasets: [{
        label: "Elevation (m)",
        data: elevations,
        borderColor: "#e30613",
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        tension: 0.1,
      }],
    },
    options: {
      scales: {
        x: { title: { display: true, text: "Distance (km)" } },
        y: { title: { display: true, text: "Elevation (m)" } },
      },
    },
  });

  const plan = [
    { from: "Start", to: "Kalmankaltio", km: 88, run: 18, rest: 1, cutoff: 24 },
    { from: "Kalmankaltio", to: "Hetta", km: 104, run: 30, rest: 2, cutoff: 73 },
    { from: "Hetta", to: "Pallas", km: 64, run: 19, rest: 3, cutoff: 97 },
    { from: "Pallas", to: "Finish", km: 70, run: 23, rest: 0, cutoff: 126 },
  ];

  const table = document.getElementById("pace-plan-body");
  table.innerHTML = "";
  let cumulativeTime = 0;
  let cumulativeDistance = 0;
  plan.forEach((seg, i) => {
    cumulativeTime += seg.run + seg.rest;
    cumulativeDistance += seg.km;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${seg.from} → ${seg.to}</td>
      <td>${seg.km}</td>
      <td>${seg.run.toFixed(2)}</td>
      <td>${(seg.km / seg.run).toFixed(2)}</td>
      <td>${seg.rest}</td>
      <td>${cumulativeTime}</td>
      <td>${seg.cutoff}</td>
    `;
    table.appendChild(tr);
  });

  const summary = document.createElement("tr");
  summary.innerHTML = `
    <td><b>Total</b></td>
    <td><b>${cumulativeDistance}</b></td>
    <td><b>${cumulativeTime}</b></td>
    <td><b>${(cumulativeDistance / (cumulativeTime - plan.reduce((a, b) => a + b.rest, 0))).toFixed(2)}</b></td>
    <td colspan="3"></td>
  `;
  table.appendChild(summary);
});
