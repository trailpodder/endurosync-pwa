import * as toGeoJSON from './togeojson.umd.js';
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';

const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00" },
  { name: "Kalmankaltio", km: 88, cutoff: "Tue 12:00", rest: 1 },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00", rest: 2 },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00", rest: 3 },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00" },
];

const goalTotalHours = 96;

const parseTime = (str) => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const [dayStr, timeStr] = str.split(" ");
  const [hours, minutes] = timeStr.split(":").map(Number);
  const dayIndex = days.indexOf(dayStr);
  const now = new Date("2025-07-07T12:00:00"); // Arbitrary base Monday
  const date = new Date(now);
  date.setDate(now.getDate() + ((dayIndex - now.getDay() + 7) % 7));
  date.setHours(hours, minutes, 0, 0);
  return date;
};

function formatTime(date) {
  return date.toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

function setupPlanner() {
  const tbody = document.getElementById("plan-table-body");
  tbody.innerHTML = "";

  const segments = [];
  for (let i = 0; i < aidStations.length - 1; i++) {
    const from = aidStations[i];
    const to = aidStations[i + 1];
    const segmentDistance = to.km - from.km;
    const rest = to.rest || 0;
    segments.push({ from, to, distance: segmentDistance, rest });
  }

  // Distribute time based on default plan
  const defaultPlan = [
    { run: 18, rest: 1 },
    { run: 30, rest: 2 },
    { run: 19, rest: 3 },
    { run: 23, rest: 0 },
  ];

  let currentTime = parseTime(aidStations[0].cutoff); // Start time
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const runTime = defaultPlan[i].run;
    const restTime = defaultPlan[i].rest;

    const arrival = new Date(currentTime.getTime() + runTime * 60 * 60 * 1000);
    const cutoffTime = parseTime(seg.to.cutoff);
    const departure = new Date(arrival.getTime() + restTime * 60 * 60 * 1000);
    const margin = Math.round((cutoffTime - departure) / (1000 * 60 * 60));

    tbody.innerHTML += `
      <tr>
        <td>${seg.from.name} → ${seg.to.name}</td>
        <td>${seg.distance.toFixed(1)}</td>
        <td>${runTime}</td>
        <td>${formatTime(arrival)}</td>
        <td><input type="number" value="${restTime}" min="0" max="5" step="1" /></td>
        <td>${formatTime(departure)}</td>
        <td>${seg.to.cutoff}</td>
        <td>${margin} h</td>
      </tr>
    `;

    currentTime = departure;
  }
}

async function loadGPX() {
  const res = await fetch("nuts300.gpx");
  const text = await res.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");
  const geojson = toGeoJSON.gpx(xml);
  return geojson;
}

async function initMap() {
  const map = L.map('map').setView([68.0, 23.5], 8);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const data = await loadGPX();
  const coords = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);

  const line = L.polyline(coords, { color: 'blue' }).addTo(map);
  map.fitBounds(line.getBounds());

  // Mark aid stations
  aidStations.forEach(station => {
    const closest = coords.reduce((prev, curr) => {
      const prevDist = Math.abs(prev[0] - station.km);
      const currDist = Math.abs(curr[0] - station.km);
      return currDist < prevDist ? curr : prev;
    });
    L.marker(closest, { title: station.name }).addTo(map).bindPopup(station.name);
  });
}

initMap();
setupPlanner();
