 const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00" },
  { name: "Kalmankaltio", km: 88, cutoff: "Tue 12:00", rest: 1 },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00", rest: 2 },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00", rest: 3 },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00" }
];

// Static pace plan based on user input
const pacePlan = [
  { from: 0, to: 88, runtime: 18, rest: 1 },
  { from: 88, to: 192, runtime: 30, rest: 2 },
  { from: 192, to: 256, runtime: 19, rest: 3 },
  { from: 256, to: 326, runtime: 23, rest: 0 }
];

async function loadGPX(url) {
  const res = await fetch(url);
  const gpxText = await res.text();
  const parser = new DOMParser();
  const gpxDoc = parser.parseFromString(gpxText, "application/xml");
  return toGeoJSON.gpx(gpxDoc);
}

function formatTime(hours) {
  const d = new Date(2023, 0, 2, 12, 0); // Base: Mon 12:00
  d.setHours(d.getHours() + hours);
  return d.toLocaleString("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short"
  });
}

function setupPlanner() {
  const planner = document.getElementById("planner");
  let totalTime = 0;
  let html = `<h2>Segment Plan (Goal: 96h)</h2><table><tr>
    <th>Segment</th><th>Distance (km)</th><th>Run Time (h)</th><th>Rest (h)</th>
    <th>Arrival</th><th>Departure</th><th>Total Elapsed</th><th>Cutoff</th>
  </tr>`;

  for (let i = 0; i < pacePlan.length; i++) {
    const seg = pacePlan[i];
    const dist = seg.to - seg.from;
    const run = seg.runtime;
    const rest = seg.rest;
    const arrival = formatTime(totalTime + run);
    totalTime += run;
    const departure = formatTime(totalTime + rest);
    totalTime += rest;

    html += `<tr>
      <td>${aidStations[i].name} → ${aidStations[i + 1].name}</td>
      <td>${dist}</td>
      <td>${run}</td>
      <td><input type="number" min="0" max="5" value="${rest}" data-index="${i}" /></td>
      <td>${arrival}</td>
      <td>${departure}</td>
      <td>${Math.round(totalTime)}h</td>
      <td>${aidStations[i + 1].cutoff}</td>
    </tr>`;
  }

  html += `</table>`;
  planner.innerHTML = html;

  // Handle rest time updates
  planner.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('change', () => {
      const idx = Number(input.dataset.index);
      pacePlan[idx].rest = Number(input.value);
      setupPlanner(); // Re-render with updated rests
    });
  });
}

async function initMap() {
  const map = L.map('map').setView([68.3, 23.6], 8);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18
  }).addTo(map);

  const geojson = await loadGPX("nuts300.gpx");

  const track = L.geoJSON(geojson, {
    style: { color: "blue" }
  }).addTo(map);
  map.fitBounds(track.getBounds());

  aidStations.forEach((a) => {
    const pt = geojson.features[0].geometry.coordinates.find(coord => coord.length === 2);
    if (pt) {
      L.marker([pt[1], pt[0]], { title: a.name }).addTo(map)
        .bindPopup(`<b>${a.name}</b><br>${a.km} km<br>Cutoff: ${a.cutoff}`);
    }
  });
}

function drawChart() {
  const ctx = document.getElementById("chart").getContext("2d");
  const labels = ["Start", "Kalmankaltio", "Hetta", "Pallas", "Finish"];
  const data = pacePlan.reduce(
    (acc, seg, i) => {
      acc.dist += seg.to - seg.from;
      acc.time += seg.runtime + seg.rest;
      acc.dists.push(seg.to);
      acc.times.push(acc.time);
      return acc;
    },
    { dist: 0, time: 0, dists: [0], times: [0] }
  );

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Cumulative Time (h)",
          data: data.times,
          borderColor: "blue",
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { title: { display: true, text: "Time (h)" }, beginAtZero: true },
        x: { title: { display: true, text: "Aid Station" } }
      }
    }
  });
}

(async function () {
  await initMap();
  setupPlanner();
  drawChart();
})();
