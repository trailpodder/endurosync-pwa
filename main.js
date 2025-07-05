const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00" },
  { name: "Kalmankaltio", km: 88, cutoff: "Tue 12:00" },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00" },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00" },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00" },
];

let gpxGeojson = null;

async function loadGPX(url) {
  const res = await fetch(url);
  const text = await res.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "application/xml");
  return toGeoJSON.gpx(xml);
}

function getLatLngAtKm(geojson, targetKm) {
  if (!geojson || !geojson.features || !geojson.features[0]) return [null, null];
  let total = 0;
  const coords = geojson.features[0].geometry.coordinates;
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    const segment = turf.distance([lon1, lat1], [lon2, lat2]);
    total += segment;
    if (total >= targetKm) {
      return [(lat1 + lat2) / 2, (lon1 + lon2) / 2];
    }
  }
  const [lonLast, latLast] = coords[coords.length - 1] || [];
  return latLast && lonLast ? [latLast, lonLast] : [null, null];
}

function parseGoalTime(text) {
  const [day, time] = text.trim().split(" ");
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayIndex = days.indexOf(day);
  if (dayIndex === -1) return null;
  const [h, m] = time.split(":").map(Number);
  const base = new Date("2025-07-14T12:00:00"); // Mon 12:00
  base.setHours(base.getHours() + (dayIndex * 24) + h - 12, m);
  return base;
}

function formatTime(date) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const d = days[date.getDay()];
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${d} ${h}:${m}`;
}

function minutesDiff(d1, d2) {
  return (d2 - d1) / 60000;
}

function updatePaceTable(goalTime) {
  const tbody = document.querySelector("#paceTable tbody");
  tbody.innerHTML = "";
  const rows = [];

  const restTimes = [0, 60, 120, 180, 0]; // in minutes (Start, Kalmankaltio, Hetta, Pallas, Finish)
  const distances = aidStations.map(s => s.km);
  const sectionDists = distances.map((km, i) => i === 0 ? 0 : km - distances[i - 1]);

  const finishTime = goalTime;
  const totalMovingMin = minutesDiff(new Date("2025-07-14T12:00:00"), finishTime) - restTimes.reduce((a, b) => a + b, 0);

  const sectionTimes = sectionDists.map((d, i) => i === 0 ? 0 : d / (totalMovingMin / 60 / (distances[distances.length - 1])) * 60);

  let eta = new Date("2025-07-14T12:00:00"); // Start time
  let elapsed = 0;

  for (let i = 0; i < aidStations.length; i++) {
    const row = document.createElement("tr");
    const seg = `${aidStations[i - 1]?.name.split(" ")[0] || "Start"} → ${aidStations[i].name.split(" ")[0]}`;

    const etaIn = new Date(eta);
    let moveMin = sectionTimes[i] || 0;
    let restMin = restTimes[i] || 0;

    let etaOut = new Date(etaIn.getTime() + (moveMin + restMin) * 60000);
    let elapsedThis = minutesDiff(new Date("2025-07-14T12:00:00"), etaOut);

    const cutoff = aidStations[i].cutoff;
    const cutoffDT = parseGoalTime(cutoff);

    const dist = sectionDists[i] || 0;
    const pace = dist ? (moveMin / dist).toFixed(1) : "-";

    row.innerHTML = `
      <td>${seg}</td>
      <td>${dist.toFixed(1)}</td>
      <td>${i === 0 ? "-" : formatTime(etaIn)}</td>
      <td style="color:${etaOut > cutoffDT ? 'red' : 'inherit'}">${i === aidStations.length - 1 ? "-" : formatTime(etaOut)}</td>
      <td>${cutoff}</td>
      <td>${moveMin.toFixed(0)} min</td>
      <td>${Math.round(elapsedThis)} min</td>
      <td>${pace} min/km</td>
    `;
    tbody.appendChild(row);

    eta = new Date(etaOut);
  }
}

async function initMap() {
  gpxGeojson = await loadGPX("nuts300.gpx");

  const map = L.map("map").setView([68.5, 21], 8);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

  L.geoJSON(gpxGeojson).addTo(map);

  aidStations.forEach(station => {
    const [lat, lon] = getLatLngAtKm(gpxGeojson, station.km);
    if (lat && lon) {
      L.marker([lat, lon]).addTo(map)
        .bindPopup(`${station.name}<br>${station.km} km<br>Cutoff: ${station.cutoff}`);
    }
  });

  const input = document.getElementById("goalTimeInput");
  const button = document.getElementById("applyGoal");

  button.addEventListener("click", () => {
    const goal = parseGoalTime(input.value);
    if (goal) updatePaceTable(goal);
    else alert("Invalid time. Use format: Fri 11:00");
  });

  updatePaceTable(parseGoalTime(input.value));
}

initMap();
