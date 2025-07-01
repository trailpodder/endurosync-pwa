// main.js (updated to fix aid station coordinates and show start/finish markers)

let map;
let routeLine;
let aidStationMarkers = [];

const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, lat: 68.50835, lon: 23.53214, cutoff: null },
  { name: "Kalmankaltio", km: 88, lat: 68.6503, lon: 23.9714, cutoff: "Sat 14:00" },
  { name: "Hetta", km: 192, lat: 68.3838, lon: 23.6221, cutoff: "Sun 10:00" },
  { name: "Pallas", km: 256, lat: 68.0605, lon: 24.0709, cutoff: "Sun 23:00" },
  { name: "Rauhala (water)", km: 277, lat: 67.9253, lon: 24.1501, cutoff: null },
  { name: "Pahtavuoma (water)", km: 288, lat: 67.8436, lon: 24.1964, cutoff: null },
  { name: "Peurakaltio (water)", km: 301, lat: 67.7622, lon: 24.2115, cutoff: null },
  { name: "Finish (Äkäslompolo)", km: 326, lat: 67.6100, lon: 24.1500, cutoff: "Mon 18:00" }
];

async function loadGPX(url) {
  const response = await fetch(url);
  const text = await response.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "application/xml");
  return togeojson.gpx(xml);
}

function addAidStationMarkers() {
  aidStations.forEach((station, index) => {
    const marker = L.marker([station.lat, station.lon])
      .addTo(map)
      .bindPopup(`<b>${station.name}</b><br>KM ${station.km}${station.cutoff ? `<br>Cutoff: ${station.cutoff}` : ""}`);
    aidStationMarkers.push(marker);
  });
}

async function initMap() {
  map = L.map("map").setView([68.4, 23.8], 8);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const gpxData = await loadGPX("nuts300.gpx");
  routeLine = L.geoJSON(gpxData, { color: "#f00", weight: 3 }).addTo(map);

  addAidStationMarkers();
}

document.addEventListener("DOMContentLoaded", initMap);
