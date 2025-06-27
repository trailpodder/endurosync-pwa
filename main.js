import * as toGeoJSON from 'https://unpkg.com/@tmcw/togeojson@0.16.0/dist/togeojson.umd.js';

const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00" },
  { name: "Kalmankaltio", km: 88, cutoff: "Tue 12:00", cutoffHour: 24 },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00", cutoffHour: 73 },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00", cutoffHour: 97 },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00", cutoffHour: 126 }
];

// Default rest times per station
let restTimes = [0, 1, 2, 3, 0]; // No rest at Start and Finish

const goalTimeInput = document.getElementById("goal-time");
const tableBody = document.querySelector("#pace-table tbody");
const totalRunTimeCell = document.getElementById("total-run-time");
const totalRestTimeCell = document.getElementById("total-rest-time");
const totalDistanceCell = document.getElementById("total-distance");

function calculatePacing(goalTimeHours) {
  tableBody.innerHTML = "";

  let totalRunTime = 0;
  let totalRestTime = 0;
  let totalDistance = 0;

  let segments = [];

  for (let i = 1; i < aidStations.length; i++) {
    const from = aidStations[i - 1];
    const to = aidStations[i];

    const distance = to.km - from.km;
    const cutoff = to.cutoffHour;

    const rest = restTimes[i] || 0;

    // Run time must be less than cutoff - all previous run/rest + rest + 1h
    const maxArrival = cutoff - 1 - rest - totalRunTime - totalRestTime;
    const runTime = Math.max(1, Math.min(maxArrival, distance / 2)); // prevent negative or zero

    totalRunTime += runTime;
    totalRestTime += rest;
    totalDistance += distance;

    const pace = (distance / runTime).toFixed(2);
    const arrivalTime = `+${(totalRunTime + totalRestTime).toFixed(2)}h`;

    segments.push({
      segment: `${from.name} → ${to.name}`,
      distance,
      runTime: runTime.toFixed(2),
      pace,
      rest,
      arrivalTime,
      cutoff: to.cutoff
    });
  }

  // Render table
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${seg.segment}</td>
      <td>${seg.distance}</td>
      <td>${seg.runTime}</td>
      <td>${seg.pace}</td>
      <td><input type="number" class="input-small rest-input" data-index="${i + 1}" value="${seg.rest}" min="0" max="5"/></td>
      <td>${seg.arrivalTime}</td>
      <td>${seg.cutoff}</td>
    `;

    tableBody.appendChild(row);
  }

  totalRunTimeCell.textContent = totalRunTime.toFixed(2);
  totalRestTimeCell.textContent = totalRestTime.toFixed(2);
  totalDistanceCell.textContent = totalDistance.toFixed(1);

  addRestInputListeners();
}

function addRestInputListeners() {
  const inputs = document.querySelectorAll(".rest-input");
  inputs.forEach((input) => {
    input.addEventListener("change", () => {
      const index = parseInt(input.dataset.index);
      const value = parseFloat(input.value);
      restTimes[index] = isNaN(value) ? 0 : value;
      calculatePacing(parseFloat(goalTimeInput.value));
    });
  });
}

// Recalculate button
document.getElementById("recalculate-btn").addEventListener("click", () => {
  calculatePacing(parseFloat(goalTimeInput.value));
});

// Initial run
calculatePacing(parseFloat(goalTimeInput.value));
