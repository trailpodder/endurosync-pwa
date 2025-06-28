import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.esm.min.js';
import { gpx } from './togeojson.umd.js';

const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00", timeLimit: 0 },
  { name: "Kalmankaltio", km: 88, cutoff: "Tue 12:00", timeLimit: 24 },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00", timeLimit: 73 },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00", timeLimit: 97 },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00", timeLimit: 126 }
];

// Default realistic plan for 96-hour goal
const plan = [
  { segment: "Start → Kalmankaltio", distance: 88, runTime: 18, rest: 1 },
  { segment: "Kalmankaltio → Hetta", distance: 104, runTime: 30, rest: 2 },
  { segment: "Hetta → Pallas", distance: 64, runTime: 19, rest: 3 },
  { segment: "Pallas → Finish", distance: 70, runTime: 23, rest: 0 }
];

function renderPlanner() {
  const table = document.getElementById("pacing-table");
  let html = `
    <thead>
      <tr>
        <th>Segment</th>
        <th>Distance (km)</th>
        <th>Run Time (h)</th>
        <th>Rest (h)</th>
        <th>Pace (km/h)</th>
        <th>Arrival Time</th>
        <th>Cumulative Time</th>
        <th>Cutoff</th>
      </tr>
    </thead>
    <tbody>
  `;

  let cumulativeTime = 0;
  let departureTime = new Date("2025-07-14T12:00:00"); // Start: Mon 12:00
  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    const totalSegmentTime = p.runTime + p.rest;
    cumulativeTime += totalSegmentTime;

    departureTime.setHours(departureTime.getHours() + p.runTime);
    const arrival = new Date(departureTime);

    const pace = (p.distance / p.runTime).toFixed(2);
    const arrivalStr = arrival.toUTCString().slice(0, 22);

    const cutoff = aidStations[i + 1]?.cutoff || "-";

    html += `
      <tr>
        <td>${p.segment}</td>
        <td>${p.distance}</td>
        <td>${p.runTime}</td>
        <td>${p.rest}</td>
        <td>${pace}</td>
        <td>${arrivalStr}</td>
        <td>${cumulativeTime} h</td>
        <td>${cutoff}</td>
      </tr>
    `;

    departureTime.setHours(departureTime.getHours() + p.rest); // add rest
  }

  const totalDistance = plan.reduce((a, b) => a + b.distance, 0);
  html += `
    <tr>
      <th>Total</th>
      <th>${totalDistance}</th>
      <th colspan="2">–</th>
      <th colspan="2">Goal: 96 h</th>
      <th>${cumulativeTime} h</th>
      <th>Cutoff: 126 h</th>
    </tr>
  `;

  html += `</tbody>`;
  table.innerHTML = html;
}

// Basic placeholder chart
function renderChart() {
  const ctx = document.getElementById("chart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: plan.map(p => p.segment),
      datasets: [{
        label: "Run Time per Segment (h)",
        data: plan.map(p => p.runTime),
        fill: false,
        borderColor: "blue"
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top" } },
      scales: {
        y: { beginAtZero: true },
        x: { ticks: { autoSkip: false } }
      }
    }
  });
}

renderPlanner();
renderChart();
