// main.js – NUTS 300 Planner

let map;
let gpxTrack;

const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, lat: 68.49944, lon: 24.73256 },
  { name: "Kalmankaltio", km: 88, lat: 68.54495, lon: 23.63578 },
  { name: "Hetta", km: 192, lat: 68.38358, lon: 23.63176 },
  { name: "Pallas", km: 256, lat: 68.05935, lon: 24.07093 },
  { name: "Rauhala (water only)", km: 277, lat: 67.98780, lon: 24.30477 },
  { name: "Pahtavuoma (water only)", km: 288, lat: 67.93316, lon: 24.41949 },
  { name: "Peurakaltio (water only)", km: 301, lat: 67.86744, lon: 24.50723 },
  { name: "Finish (Äkäslompolo)", km: 326, lat: 67.62402, lon: 24.14969 }
];

async function loadGPX(url) {
  const response = await fetch(url);
  const gpxText = await response.text();
  const parser = new DOMParser();
  const gpxDoc = parser.parseFromString(gpxText, "application/xml");
  return togeojson.gpx(gpxDoc);
}

function initMap() {
  map = L.map('map').setView([68.1, 24.0], 8);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);
}

function plotAidStations() {
  aidStations.forEach(station => {
    const marker = L.marker([station.lat, station.lon]).addTo(map);
    marker.bindPopup(`${station.name}<br>${station.km} km`);
  });
}

async function plotRoute() {
  const geojson = await loadGPX("nuts300.gpx");
  gpxTrack = L.geoJSON(geojson, {
    style: {
      color: 'blue',
      weight: 3
    }
  }).addTo(map);

  map.fitBounds(gpxTrack.getBounds());
}

async function initPlanner() {
  initMap();
  await plotRoute();
  plotAidStations();
}

window.onload = initPlanner;
