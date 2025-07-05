let map;
let gpxData;
let aidStations = [
  { name: "Start", km: 0, cutoff: "Mon 12:00" },
  { name: "Kalmankaltio", km: 88, cutoff: "Tue 12:00" },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00" },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00" },
  { name: "Rauhala", km: 277, waterOnly: true },
  { name: "Pahtavuoma", km: 288, waterOnly: true },
  { name: "Peurakaltio", km: 301, waterOnly: true },
  { name: "Finish", km: 326, cutoff: "Sat 18:00" }
];

async function initMap() {
  map = L.map("map").setView([68.3, 21.5], 8);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

  const res = await fetch("nuts300.gpx");
  const gpxText = await res.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxText, "text/xml");
  gpxData = toGeoJSON.gpx(xmlDoc);

  const gpxLine = L.geoJSON(gpxData, {
    style: { color: "blue" }
  }).addTo(map);
  map.fitBounds(gpxLine.getBounds());

  aidStations.forEach(station => {
    const nearest = findNearestPoint(station.km);
    station.latlng = nearest;
    if (station.waterOnly) {
      L.circleMarker(nearest, { radius: 5, color: 'cyan' }).addTo(map)
        .bindPopup(`${station.name} (${station.km} km, water only)`);
    } else {
      L.marker(nearest).addTo(map).bindPopup(`${station.name} (${station.km} km)`);
    }
  });

  drawTable();
}

function findNearestPoint(targetKm) {
  let dist = 0;
  for (let i = 1; i < gpxData.features[0].geometry.coordinates.length; i++) {
    const prev = gpxData.features[0].geometry.coordinates[i - 1];
    const curr = gpxData.features[0].geometry.coordinates[i];
    const d = turf.distance(turf.point(prev), turf.point(curr));
    dist += d;
    if (dist * 1000 >= targetKm * 1000) {
      return [curr[1], curr[0]];
    }
  }
  return null;
}

function drawTable() {
  const table = document.getElementById("pace-table");
  table.innerHTML = "";
  const header = `<tr>
    <th>Station</th><th>Distance (km)</th><th>Cutoff</th>
    <th>ETA In</th><th>ETA Out</th><th>Rest (h)</th>
    <th>Section (h)</th><th>Total (h)</th><th>Pace (min/km)</th>
  </tr>`;
  table.insertAdjacentHTML("beforeend", header);

  let lastKm = 0;
  let lastTotal = 0;
  aidStations.forEach((s, i) => {
    if (s.waterOnly) return;
    const next = aidStations.find((a, j) => j > i && !a.waterOnly);

    let etaIn = s.etaIn || "";
    let etaOut = s.etaOut || "";
    let rest = "";
    let section = "";
    let total = "";
    let pace = "";

    if (i === 0) {
      etaOut = etaOut || "Mon 12:00";
      total = 0;
    } else if (etaIn && etaOut) {
      const sectionHours = parseTimeDiff(etaIn, etaOut);
      const totalHours = parseTimeDiff("Mon 12:00", etaOut);
      const dist = s.km - lastKm;
      pace = (sectionHours * 60 / dist).toFixed(1);
      section = sectionHours;
      total = totalHours;
      rest = parseTimeDiff(etaIn, etaOut);
    }

    const row = `<tr>
      <td>${s.name}</td><td>${s.km}</td><td>${s.cutoff || ""}</td>
      <td><input data-station="${s.name}" data-type="etaIn" value="${etaIn}"></td>
      <td><input data-station="${s.name}" data-type="etaOut" value="${etaOut}"></td>
      <td>${rest}</td><td>${section}</td><td>${total}</td><td>${pace}</td>
    </tr>`;
    table.insertAdjacentHTML("beforeend", row);

    lastKm = s.km;
    lastTotal = total;
  });

  document.querySelectorAll("#pace-table input").forEach(input => {
    input.addEventListener("change", e => {
      const name = input.dataset.station;
      const type = input.dataset.type;
      const value = input.value;
      const s = aidStations.find(st => st.name === name);
      s[type] = value;
      drawTable();
    });
  });
}

function parseTimeDiff(startStr, endStr) {
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const [sDay, sTime] = startStr.split(" ");
  const [eDay, eTime] = endStr.split(" ");
  const sIdx = days.indexOf(sDay);
  const eIdx = days.indexOf(eDay);
  const [sH,sM] = sTime.split(":").map(Number);
  const [eH,eM] = eTime.split(":").map(Number);
  let diff = (eIdx - sIdx) * 24 + (eH - sH) + (eM - sM)/60;
  return Math.round(diff * 100) / 100;
}

function applyGoalTime() {
  const goal = document.getElementById("goal-time").value; // e.g. "Fri 11:00"
  const plan = [
    { name: "Start", etaOut: "Mon 12:00" },
    { name: "Kalmankaltio", etaIn: "Tue 06:00", etaOut: "Tue 07:00" },
    { name: "Hetta", etaIn: "Wed 13:00", etaOut: "Wed 15:00" },
    { name: "Pallas", etaIn: "Thu 10:00", etaOut: "Thu 13:00" },
    { name: "Finish", etaIn: goal }
  ];
  plan.forEach(p => {
    const s = aidStations.find(a => a.name === p.name);
    if (s) {
      s.etaIn = p.etaIn;
      s.etaOut = p.etaOut;
    }
  });
  drawTable();
}

initMap();
