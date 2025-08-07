const aidStations = [
  { name: "Start (Njurgulahti)", dist: 0, lat: 68.5366, lon: 24.2609, cutoff: "Mon 12:00" },
  { name: "Kalmankaltio", dist: 88, lat: 68.2822, lon: 23.6215, cutoff: "Tue 12:00" },
  { name: "Hetta", dist: 192, lat: 68.3838, lon: 23.6227, cutoff: "Thu 13:00" },
  { name: "Pallas", dist: 256, lat: 68.3735, lon: 24.0583, cutoff: "Fri 13:00" },
  { name: "Finish (Äkäslompolo)", dist: 326, lat: 67.6026, lon: 24.1506, cutoff: "Sat 18:00" }
];

function timeStrToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTimeStr(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addRow(tableBody, i, station, nextStation) {
  const row = document.createElement("tr");
  const distance = nextStation ? nextStation.dist - station.dist : 0;

  row.innerHTML = `
    <td>${station.name}</td>
    <td>${distance > 0 ? distance : "-"}</td>
    <td><input type="time" value="${i === 0 ? "00:00" : i === 1 ? "18:00" : i === 2 ? "30:00" : i === 3 ? "19:00" : "22:00"}" step="60" class="run"></td>
    <td><input type="time" value="${i === 0 || i === 4 ? "00:00" : i === 1 ? "01:00" : i === 2 ? "02:00" : "03:00"}" step="60" class="rest"></td>
    <td class="etain">-</td>
    <td class="etaout">-</td>
    <td class="elapsed">-</td>
    <td class="pace">-</td>
    <td>${station.cutoff}</td>
  `;

  tableBody.appendChild(row);
}

function calculatePlan() {
  const tbody = document.querySelector("#pacingTable tbody");
  const rows = tbody.querySelectorAll("tr");
  let totalElapsed = 0;
  let resultTime = "";

  rows.forEach((row, i) => {
    const run = row.querySelector(".run").value;
    const rest = row.querySelector(".rest").value;
    const runMin = timeStrToMinutes(run);
    const restMin = timeStrToMinutes(rest);
    const elapsedCell = row.querySelector(".elapsed");
    const etaInCell = row.querySelector(".etain");
    const etaOutCell = row.querySelector(".etaout");
    const paceCell = row.querySelector(".pace");

    if (i === 0) {
      etaInCell.textContent = "-";
      etaOutCell.textContent = "Mon 12:00";
      elapsedCell.textContent = "00:00";
    } else {
      const etaOutPrev = rows[i - 1].querySelector(".etaout").textContent;
      const etaTimeParts = etaOutPrev.split(" ")[1].split(":");
      let etaTotalMin = timeStrToMinutes(`${etaTimeParts[0]}:${etaTimeParts[1]}`);

      totalElapsed += runMin + restMin;
      const etaInTime = minutesToTimeStr(etaTotalMin + runMin);
      const etaOutTime = minutesToTimeStr(etaTotalMin + runMin + restMin);

      const dayList = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const etaInDay = dayList[Math.floor((totalElapsed + 720) / 1440) % 7];
      const etaOutDay = dayList[Math.floor((totalElapsed + 720 + restMin) / 1440) % 7];

      etaInCell.textContent = `${etaInDay} ${etaInTime}`;
      etaOutCell.textContent = i === rows.length - 1 ? "-" : `${etaOutDay} ${etaOutTime}`;
      elapsedCell.textContent = minutesToTimeStr(totalElapsed);
    }

    const dist = aidStations[i + 1] ? aidStations[i + 1].dist - aidStations[i].dist : 0;
    const pace = dist && runMin ? (dist / (runMin / 60)).toFixed(2) : "-";
    paceCell.textContent = pace !== "-" ? `${pace} km/h` : "-";
  });

  const goalHours = Math.floor(totalElapsed / 60);
  const goalMinutes = totalElapsed % 60;
  const goalDay = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][(Math.floor((720 + totalElapsed) / 1440)) % 7];
  const goalTimeStr = `${String(goalHours).padStart(2, '0')}:${String(goalMinutes).padStart(2, '0')} h ${goalDay} ${minutesToTimeStr((720 + totalElapsed) % 1440)}`;
  document.getElementById("goalTime").textContent = goalTimeStr;
}

function initMap() {
  const map = L.map("map").setView([68.4, 24.0], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  aidStations.forEach(station => {
    L.marker([station.lat, station.lon]).addTo(map).bindPopup(`${station.name}<br>Cutoff: ${station.cutoff}`);
  });

  fetch("nuts300.gpx")
    .then(response => response.text())
    .then(gpxText => {
      const gpx = new DOMParser().parseFromString(gpxText, "text/xml");
      const geojson = togeojson.gpx(gpx);
      L.geoJSON(geojson, {
        style: {
          color: "blue",
          weight: 3,
          opacity: 0.7
        }
      }).addTo(map);
    });

  const tbody = document.querySelector("#pacingTable tbody");
  for (let i = 0; i < aidStations.length; i++) {
    addRow(tbody, i, aidStations[i], aidStations[i + 1]);
  }

  document.getElementById("calculateBtn").addEventListener("click", calculatePlan);
  calculatePlan();
}

document.addEventListener("DOMContentLoaded", initMap);
