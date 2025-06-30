async function loadGPX(url) {
  const res = await fetch(url);
  const text = await res.text();
  const parser = new DOMParser();
  const gpxDoc = parser.parseFromString(text, 'application/xml');
  return togeojson.gpx(gpxDoc);
}

const aidStations = [
  { name: 'Start (Njurgulahti)', km: 0, cutoff: 0, rest: 0 },
  { name: 'Kalmankaltio', km: 88, cutoff: 24, rest: 1 },
  { name: 'Hetta', km: 192, cutoff: 73, rest: 2 },
  { name: 'Pallas', km: 256, cutoff: 97, rest: 3 },
  { name: 'Finish (Äkäslompolo)', km: 326, cutoff: 126, rest: 0 }
];

const startTime = new Date('2025-09-01T12:00:00'); // Monday 12:00

function formatTime(dt) {
  return dt.toLocaleString('en-GB', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function buildPlan() {
  const plan = [];
  let currentTime = new Date(startTime);
  let totalTime = 0;

  const segments = [
    { runTime: 18 },
    { runTime: 30 },
    { runTime: 19 },
    { runTime: 23 }
  ];

  for (let i = 0; i < 4; i++) {
    const from = aidStations[i];
    const to = aidStations[i + 1];
    const run = segments[i].runTime;
    const rest = to.rest;
    const total = run + rest;
    totalTime += total;

    currentTime.setHours(currentTime.getHours() + run);
    const arrival = new Date(currentTime);

    plan.push({
      segment: `${from.name} → ${to.name}`,
      distance: to.km - from.km,
      runTime: run,
      rest,
      total,
      cutoff: to.cutoff - from.cutoff,
      speed: ((to.km - from.km) / run).toFixed(2),
      arrival: formatTime(arrival)
    });

    currentTime.setHours(currentTime.getHours() + rest);
  }

  return plan;
}

function renderPlanner(plan) {
  const tbody = document.querySelector('#planner tbody');
  tbody.innerHTML = '';
  plan.forEach(row => {
    const tr = document.createElement('tr');
    [
      row.segment,
      row.distance,
      row.runTime,
      row.rest,
      row.total,
      row.cutoff,
      row.speed,
      row.arrival
    ].forEach(val => {
      const td = document.createElement('td');
      td.textContent = val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function plotChart(plan) {
  const ctx = document.getElementById('chart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: plan.map(p => p.segment),
      datasets: [
        {
          label: 'Run Time (h)',
          data: plan.map(p => p.runTime),
          backgroundColor: 'rgba(75, 192, 192, 0.6)'
        },
        {
          label: 'Rest (h)',
          data: plan.map(p => p.rest),
          backgroundColor: 'rgba(255, 159, 64, 0.6)'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Segment Times' }
      }
    }
  });
}

async function initMap() {
  const map = L.map('map').setView([68.3, 23.7], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  const geojson = await loadGPX('nuts300.gpx');
  const route = L.geoJSON(geojson, { color: 'blue' }).addTo(map);
  map.fitBounds(route.getBounds());

  aidStations.forEach(pt => {
    if (pt.km > 0 && pt.km < 326) {
      L.circleMarker([0, 0], {
        radius: 6,
        fillColor: 'red',
        fillOpacity: 0.8,
        color: 'white',
        weight: 1
      }).addTo(map).bindTooltip(pt.name); // Placeholder
    }
  });
}

(async () => {
  const plan = buildPlan();
  renderPlanner(plan);
  plotChart(plan);
  await initMap();
})();
