const aidStations = [
  { name: "Start (Njurgulahti)", dist: 0, cutoff: "Mon 12:00", run: "00:00", rest: "00:00" },
  { name: "Kalmankaltio", dist: 88, cutoff: "Tue 12:00", run: "18:00", rest: "01:00" },
  { name: "Hetta", dist: 192, cutoff: "Thu 13:00", run: "30:00", rest: "02:00" },
  { name: "Pallas", dist: 256, cutoff: "Fri 13:00", run: "19:00", rest: "03:00" },
  { name: "Finish (Äkäslompolo)", dist: 326, cutoff: "Sat 18:00", run: "22:00", rest: "00:00" }
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
    <td><input type="text" value="${station.run}" pattern="[0-9]{2}:[0-9]{2}" class="run"></td>
    <td><input type="text" value="${station.rest}" pattern="[0-9]{2}:[0-9]{2}" class="rest"></td>
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
  let cumulativeMinutes = 0;
  const startOffsetMinutes = 12 * 60; // Mon 12:00
  const dayList = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
      const arrivalMinutes = cumulativeMinutes + runMin;
      const departureMinutes = arrivalMinutes + restMin;

      const absoluteArrivalMinutes = startOffsetMinutes + arrivalMinutes;
      const arrivalDay = dayList[Math.floor(absoluteArrivalMinutes / 1440) % 7];
      const arrivalTime = minutesToTimeStr(absoluteArrivalMinutes % 1440);
      etaInCell.textContent = `${arrivalDay} ${arrivalTime}`;

      const absoluteDepartureMinutes = startOffsetMinutes + departureMinutes;
      const departureDay = dayList[Math.floor(absoluteDepartureMinutes / 1440) % 7];
      const departureTime = minutesToTimeStr(absoluteDepartureMinutes % 1440);
      etaOutCell.textContent = i === rows.length - 1 ? "-" : `${departureDay} ${departureTime}`;
      elapsedCell.textContent = minutesToTimeStr(departureMinutes);

      cumulativeMinutes = departureMinutes;
    }

    const dist = aidStations[i + 1] ? aidStations[i + 1].dist - aidStations[i].dist : 0;
    const pace = dist && runMin ? (dist / (runMin / 60)).toFixed(2) : "-";
    paceCell.textContent = pace !== "-" ? `${pace} km/h` : "-";
  });

  const goalHours = Math.floor(cumulativeMinutes / 60);
  const goalMinutes = cumulativeMinutes % 60;
  const absoluteGoalMinutes = startOffsetMinutes + cumulativeMinutes;
  const goalDay = dayList[(Math.floor(absoluteGoalMinutes / 1440)) % 7];
  const goalTimeStr = `${String(goalHours).padStart(2, '0')}:${String(goalMinutes).padStart(2, '0')} h ${goalDay} ${minutesToTimeStr(absoluteGoalMinutes % 1440)}`;
  document.getElementById("goalTime").textContent = goalTimeStr;
}

function initialize() {
  const tbody = document.querySelector("#pacingTable tbody");
  for (let i = 0; i < aidStations.length; i++) {
    addRow(tbody, i, aidStations[i], aidStations[i + 1]);
  }

  document.getElementById("calculateBtn").addEventListener("click", calculatePlan);
  calculatePlan();
}

document.addEventListener("DOMContentLoaded", initialize);
