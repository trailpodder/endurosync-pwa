import { toGeoJSON } from 'https://cdn.jsdelivr.net/npm/@tmcw/togeojson@0.16.0/dist/togeojson.umd.js';

const map = L.map('map').setView([68.5, 21.5], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18
}).addTo(map);

const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00" },
  { name: "Kalmankaltio", km: 88, cutoff: "Tue 12:00", rest: 1 },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00", rest: 2 },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00", rest: 3 },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00" }
];

function parseCutoff(cutoffStr) {
  const [day, time] = cutoffStr.split(' ');
  const baseDate = new Date("2025-07-14T12:00:00"); // Race starts Mon 12:00
  const days = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5 };
  const [h, m] = time.split(':').map(Number);
  const cutoff = new Date(baseDate);
  cutoff.setDate(baseDate.getDate() + days[day]);
  cutoff.setHours(h, m);
  return cutoff;
}

function setupPlanner() {
  const planBody = document.getElementById("plan-body");
  planBody.innerHTML = "";

  let currentTime = new Date("2025-07-14T12:00:00"); // Mon 12:00 start
  let lastKm = 0;
  let totalTime = 0;

  for (let i = 1; i < aidStations.length; i++) {
    const prev = aidStations[i - 1];
    const curr = aidStations[i];

    const segmentKm = curr.km - lastKm;
    const cutoff = parseCutoff(curr.cutoff);
    const rest = curr.rest || 0;

    // Calculate available time for segment
    const latestArrival = new Date(cutoff.getTime() - (rest + 1) * 3600000); // cutoff - rest - 1h margin
    const runTimeHrs = (latestArrival - currentTime) / 3600000;

    const pace = (segmentKm / runTimeHrs).toFixed(2);
    const arrival = new Date(currentTime.getTime() + runTimeHrs * 3600000);
    totalTime += runTimeHrs + rest;
    lastKm = curr.km;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${prev.name} → ${curr.name}</td>
      <td>${segmentKm.toFixed(1)} km</td>
      <td>${runTimeHrs.toFixed(2)} h</td>
      <td>${pace} km/h</td>
      <td>${curr.cutoff}</td>
    `;
    planBody.appendChild(row);

    currentTime = new Date(arrival.getTime() + rest * 3600000);
  }

  const summary = document.createElement("tr");
  summary.innerHTML = `
    <td><strong>Total</strong></td>
    <td><strong>326 km</strong></td>
    <td><strong>${totalTime.toFixed(2)} h</strong></td>
    <td colspan="2"></td>
  `;
  planBody.appendChild(summary);
}

function loadGPX(url) {
  fetch(url)
    .then(res => res.text())
    .then(gpxText => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(gpxText, "application/xml");
      const geojson = toGeoJSON.gpx(xml);
      const gpxLayer = L.geoJSON(geojson).addTo(map);
      map.fitBounds(gpxLayer.getBounds());
    })
    .catch(err => console.error("Error loading GPX:", err));
}

document.addEventListener("DOMContentLoaded", () => {
  loadGPX("nuts300.gpx");
  setupPlanner();
});
