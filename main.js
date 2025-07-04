let map;
let routeLine;
let gpxGeojson;

const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00" },
  { name: "Kalmankaltio", km: 88, cutoff: "Tue 12:00" },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00" },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00" },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00" }
];

function parseTime(str) {
  const [day, hm] = str.split(" ");
  const [h, m] = hm.split(":").map(Number);
  const dayOffsets = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const base = new Date("2025-07-13T00:00:00Z"); // Sun 00:00
  return new Date(base.getTime() + (dayOffsets[day] * 24 + h) * 3600000 + m * 60000);
}

function minutesBetween(t1, t2) {
  return (t2 - t1) / 60000;
}

function formatTimeString(minutes) {
  const total = new Date(new Date("2025-07-14T12:00:00Z").getTime() + minutes * 60000);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[total.getUTCDay()]} ${String(total.getUTCHours()).padStart(2, "0")}:${String(total.getUTCMinutes()).padStart(2, "0")}`;
}

function loadGPX(url) {
  return fetch(url)
    .then(res => res.text())
    .then(str => (new DOMParser()).parseFromString(str, "text/xml"))
    .then(gpx => toGeoJSON.gpx(gpx));
}

function getLatLngAtKm(geojson, targetKm) {
  let total = 0;
  const coords = geojson.features[0].geometry.coordinates;

  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    const segmentKm = turf.distance([lon1, lat1], [lon2, lat2]);
    total += segmentKm;
    if (total >= targetKm) {
      return [(lat1 + lat2) / 2, (lon1 + lon2) / 2];
    }
  }
  const [lonLast, latLast] = coords[coords.length - 1];
  return [latLast, lonLast];
}

function createTimeInput(id, defaultMinutes) {
  const input = document.createElement("input");
  input.type = "time";
  input.id = id;
  input.step = 60;
  const base = new Date("2025-07-14T12:00:00Z");
  const d = new Date(base.getTime() + defaultMinutes * 60000);
  input.value = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  return input;
}

function buildTable() {
  const table = document.getElementById("pace-table");
  table.innerHTML = "";
  const header = table.insertRow();
  ["Aid Station", "ETA In", "ETA Out", "Cutoff", "Rest (h)"].forEach(text => header.insertCell().textContent = text);

  aidStations.forEach((s, i) => {
    const row = table.insertRow();
    row.insertCell().textContent = s.name;

    if (i === 0) {
      row.insertCell().textContent = "-";
    } else {
      const inId = `etain-${i}`;
      row.insertCell().appendChild(createTimeInput(inId, i * 500));
    }

    if (i === aidStations.length - 1) {
      row.insertCell().textContent = "-";
    } else {
      const outId = `etaout-${i}`;
      row.insertCell().appendChild(createTimeInput(outId, i * 500 + 60));
    }

    row.insertCell().textContent = s.cutoff;

    const restCell = row.insertCell();
    restCell.id = `rest-${i}`;
    restCell.textContent = "-";
  });
}

function calculatePlan() {
  const summary = document.getElementById("summary");
  const table = document.getElementById("pace-table");
  let totalMinutes = 0;
  let valid = true;

  for (let i = 1; i < aidStations.length; i++) {
    const inInput = document.getElementById(`etain-${i}`);
    const outInput = document.getElementById(`etaout-${i}`);
    const row = table.rows[i + 1];

    const etaIn = inInput ? inInput.value : null;
    const etaOut = outInput ? outInput.value : null;

    if (etaIn && etaOut) {
      const inMin = parseTime(`Mon ${etaIn}`);
      const outMin = parseTime(`Mon ${etaOut}`);
      const diffMin = minutesBetween(inMin, outMin);
      const restHours = (diffMin / 60).toFixed(2);
      document.getElementById(`rest-${i}`).textContent = restHours;

      totalMinutes += minutesBetween(i === 1 ? parseTime("Mon 12:00") : parseTime(`Mon ${document.getElementById(`etaout-${i - 1}`).value}`), inMin);
      totalMinutes += diffMin;

      const cutoff = parseTime(aidStations[i].cutoff);
      if (outMin > cutoff) {
        row.classList.add("cutoff-exceeded");
        valid = false;
      } else {
        row.classList.remove("cutoff-exceeded");
      }
    }
  }

  summary.textContent = `Total Time: ${formatTimeString(totalMinutes)} (${(totalMinutes / 60).toFixed(2)} h)${valid ? "" : " ⚠ Cutoff exceeded!"}`;
}

async function initMap() {
  map = L.map("map").setView([68.3, 24.0], 8);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  gpxGeojson = await loadGPX("nuts300.gpx");

  routeLine = L.geoJSON(gpxGeojson, { style: { color: "blue" } }).addTo(map);
  map.fitBounds(routeLine.getBounds());

  aidStations.forEach(station => {
    const [lat, lon] = getLatLngAtKm(gpxGeojson, station.km);
    L.marker([lat, lon])
      .addTo(map)
      .bindPopup(`<b>${station.name}</b><br>${station.km} km<br>Cutoff: ${station.cutoff}`);
  });

  buildTable();
}

initMap();
