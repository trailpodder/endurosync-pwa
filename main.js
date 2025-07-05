const aidStations = [
  { name: "Start", km: 0, lat: 68.5946, lon: 23.9347, cutoff: "Mon 12:00" },
  { name: "Kalmankaltio", km: 88, lat: 68.3783, lon: 24.2073, cutoff: "Tue 12:00" },
  { name: "Hetta", km: 192, lat: 68.3832, lon: 23.6332, cutoff: "Thu 13:00" },
  { name: "Pallas", km: 256, lat: 68.0579, lon: 24.0704, cutoff: "Fri 13:00" },
  { name: "Rauhala", km: 277, lat: 67.9734, lon: 24.2030, waterOnly: true },
  { name: "Pahtavuoma", km: 288, lat: 67.9398, lon: 24.2874, waterOnly: true },
  { name: "Peurakaltio", km: 301, lat: 67.8691, lon: 24.2996, waterOnly: true },
  { name: "Finish", km: 326, lat: 67.6061, lon: 24.1522, cutoff: "Sat 18:00" }
];

const defaultSchedule = [
  { etaIn: "", etaOut: "Mon 12:00", rest: "" },
  { etaIn: "Tue 06:00", etaOut: "Tue 07:00", rest: "01:00" },
  { etaIn: "Wed 13:00", etaOut: "Wed 15:00", rest: "02:00" },
  { etaIn: "Thu 10:00", etaOut: "Thu 13:00", rest: "03:00" },
  { etaIn: "Fri 11:00", etaOut: "", rest: "" }
];

function parseTime(str) {
  const [day, time] = str.split(" ");
  const [h, m] = time.split(":").map(Number);
  const base = new Date("2025-07-14T12:00:00"); // Mon 12:00
  const dayOffsets = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5 };
  base.setHours(12 + 24 * (dayOffsets[day] || 0)); // adjust to start
  return new Date(base.getTime() - (12 * 60 * 60 * 1000) + h * 3600000 + m * 60000);
}

function formatTime(date) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const d = new Date(date);
  const day = days[d.getDay()];
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${h}:${m}`;
}

function hoursBetween(start, end) {
  return (end - start) / 3600000;
}

function updateTable() {
  const tbody = document.querySelector("#paceTable tbody");
  tbody.innerHTML = "";

  let totalElapsed = 0;
  let finishTime = parseTime(defaultSchedule.at(-1).etaIn);
  const startTime = parseTime("Mon 12:00");

  aidStations.forEach((s, i) => {
    if (s.waterOnly) return;

    const row = document.createElement("tr");
    const sched = defaultSchedule[i];
    const next = aidStations[i + 1];
    const prevKm = aidStations[i - 1]?.km ?? 0;

    const etaIn = sched.etaIn ? parseTime(sched.etaIn) : null;
    const etaOut = sched.etaOut ? parseTime(sched.etaOut) : null;

    let sectionTime = 0;
    if (i > 0 && sched.etaIn) {
      const prevEtaOut = parseTime(defaultSchedule[i - 1].etaOut);
      sectionTime = hoursBetween(prevEtaOut, etaIn);
      totalElapsed += sectionTime;
    }

    if (sched.rest) {
      const [hr, min] = sched.rest.split(":").map(Number);
      totalElapsed += hr + (min / 60);
    }

    const pace = i > 0
      ? ((s.km - prevKm) / sectionTime).toFixed(2)
      : "-";

    row.innerHTML = `
      <td>${s.name}</td>
      <td>${i === 0 ? "-" : s.km - prevKm}</td>
      <td><input value="${sched.etaIn || "-"}"></td>
      <td><input value="${sched.etaOut || "-"}"></td>
      <td>${sched.rest || "-"}</td>
      <td>${i === 0 ? "-" : `${Math.floor(sectionTime).toString().padStart(2, "0")}:${String(Math.round((sectionTime % 1) * 60)).padStart(2, "0")}`}</td>
      <td>${`${Math.floor(totalElapsed).toString().padStart(2, "0")}:${String(Math.round((totalElapsed % 1) * 60)).padStart(2, "0")}`}</td>
      <td>${pace}</td>
      <td>${s.cutoff || "-"}</td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById("goalTotal").textContent = `(${Math.round(totalElapsed)}:00 h ${formatTime(finishTime)})`;
}

async function initMap() {
  const map = L.map('map').setView([68.3, 24.0], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  const gpxRes = await fetch("nuts300.gpx");
  const gpxText = await gpxRes.text();
  const parser = new DOMParser();
  const gpx = parser.parseFromString(gpxText, "application/xml");
  const geojson = toGeoJSON.gpx(gpx);

  L.geoJSON(geojson).addTo(map);

  aidStations.forEach(station => {
    const marker = L.marker([station.lat, station.lon])
      .addTo(map)
      .bindPopup(`${station.name}${station.waterOnly ? " (Water Only)" : ""}`);
  });

  updateTable();
}

initMap();
