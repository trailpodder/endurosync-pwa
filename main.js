const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00", lat: 68.44063, lon: 24.78489 },
  { name: "Kalmankaltio", km: 88, cutoff: "Tue 12:00", lat: 68.17676, lon: 23.65868 },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00", lat: 68.38431, lon: 23.63673 },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00", lat: 68.06061, lon: 24.07029 },
  { name: "Rauhala (water)", km: 277, lat: 68.02188, lon: 23.85067 },
  { name: "Pahtavuoma (water)", km: 288, lat: 67.98126, lon: 23.68443 },
  { name: "Peurakaltio (water)", km: 301, lat: 67.96107, lon: 23.45345 },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00", lat: 67.63791, lon: 23.68933 }
];

const pacingDefaults = [
  { etaIn: "-", etaOut: "Mon 12:00", rest: "-" },
  { etaIn: "Tue 06:00", etaOut: "Tue 07:00", rest: "01:00h" },
  { etaIn: "Wed 13:00", etaOut: "Wed 15:00", rest: "02:00h" },
  { etaIn: "Thu 10:00", etaOut: "Thu 13:00", rest: "03:00h" },
  { etaIn: "Fri 11:00", etaOut: "-", rest: "-" }
];

function parseTime(str) {
  const [dayStr, timeStr] = str.split(" ");
  const [h, m] = timeStr.split(":").map(Number);
  const base = new Date("2025-07-14T12:00:00"); // Mon 12:00 race start
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const delta = days.indexOf(dayStr) * 24 * 60 + h * 60 + m;
  return new Date(base.getTime() + delta * 60000);
}

function formatTimeHM(date) {
  const h = String(date.getUTCHours()).padStart(2, "0");
  const m = String(date.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function diffHM(t1, t0) {
  const diffMin = (t1 - t0) / 60000;
  const h = Math.floor(diffMin / 60);
  const m = Math.round(diffMin % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeToHours(t1, t0) {
  return (t1 - t0) / 3600000;
}

function updateTable() {
  const tbody = document.querySelector("#pacing-table tbody");
  tbody.innerHTML = "";

  const startTime = parseTime("Mon 12:00");
  let prevTime = startTime;
  let prevKm = 0;
  let totalElapsed = 0;

  for (let i = 0; i < aidStations.length; i++) {
    const a = aidStations[i];
    const row = document.createElement("tr");

    const isWater = a.name.includes("(water)");
    if (isWater) continue;

    const defaults = pacingDefaults[i];
    const etaIn = defaults.etaIn === "-" ? null : parseTime(defaults.etaIn);
    const etaOut = defaults.etaOut === "-" ? null : parseTime(defaults.etaOut);
    const cutoff = a.cutoff ? parseTime(a.cutoff) : null;

    const sectionTime = etaIn && prevTime ? diffHM(etaIn, prevTime) : "-";
    const elapsed = etaIn ? timeToHours(etaIn, startTime) : 0;
    const totalElapsedStr = etaIn ? diffHM(etaIn, startTime) : "00:00";

    const dist = a.km - prevKm;
    const pace = etaIn && prevTime ? (dist / timeToHours(etaIn, prevTime)).toFixed(2) : "-";

    row.innerHTML = `
      <td>${a.name}</td>
      <td>${a.km - prevKm}</td>
      <td>${defaults.etaIn}</td>
      <td>${defaults.etaOut}</td>
      <td>${a.cutoff || "-"}</td>
      <td>${defaults.rest}</td>
      <td>${sectionTime}</td>
      <td>${totalElapsedStr}</td>
      <td>${pace}</td>
    `;

    if (cutoff && etaOut && etaOut > cutoff) {
      row.classList.add("unacceptable");
    }

    tbody.appendChild(row);
    if (etaOut) prevTime = etaOut;
    prevKm = a.km;
  }

  // Update goal summary
  const goalInput = document.getElementById("goal-time").value;
  const goalFinish = parseTime(goalInput);
  const goalHours = timeToHours(goalFinish, startTime);
  document.getElementById("goal-summary").textContent =
    `${Math.floor(goalHours)}:${String(Math.round((goalHours % 1) * 60)).padStart(2, "0")} h ${goalInput}`;
}

async function initMap() {
  const map = L.map("map").setView([68.1, 23.8], 7);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  // GPX route
  const res = await fetch("nuts300.gpx");
  const gpxText = await res.text();
  const parser = new DOMParser();
  const gpx = parser.parseFromString(gpxText, "text/xml");
  const geojson = toGeoJSON.gpx(gpx);
  const route = L.geoJSON(geojson).addTo(map);
  map.fitBounds(route.getBounds());

  // Aid stations
  aidStations.forEach(a => {
    L.marker([a.lat, a.lon])
      .addTo(map)
      .bindPopup(`${a.name}<br>${a.km} km`);
  });

  updateTable();
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("goal-time").addEventListener("change", updateTable);
  initMap();
});
