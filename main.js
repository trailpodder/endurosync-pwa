let map, routeLine, paceChart;
let aidStations = [
  { name: "Start", km: 0, cutoff: "Mon 12:00", latlng: [68.4955, 23.7432] },
  { name: "Kalmankaltio", km: 88, cutoff: "Tue 12:00", latlng: [68.2704, 23.9318] },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00", latlng: [68.3834, 23.6197] },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00", latlng: [68.0538, 24.0703] },
  { name: "Finish", km: 326, cutoff: "Sat 18:00", latlng: [67.6070, 24.1436] },
];

let defaultRests = [1, 2, 3]; // in hours
let goalTime = 96; // in hours

function loadGPX(url, callback) {
  fetch(url)
    .then(res => res.text())
    .then(gpxText => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(gpxText, 'text/xml');
      const geojson = togeojson.gpx(xml);
      callback(geojson);
    });
}

function initMap(geojson) {
  map = L.map('map').setView([68.2, 23.7], 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  routeLine = L.geoJSON(geojson, {
    style: { color: 'blue', weight: 3 }
  }).addTo(map);

  aidStations.forEach((a, idx) => {
    L.marker(a.latlng, {
      icon: L.icon({
        iconUrl: 'favicon.ico',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })
    }).addTo(map).bindPopup(`<b>${a.name}</b><br>${a.km} km<br>Cutoff: ${a.cutoff}`);

    // Add rest sliders
    if (idx > 0 && idx < aidStations.length - 1) {
      const restId = `rest${idx}`;
      document.getElementById('rest-controls').innerHTML += `
        <label>${a.name} rest (h): 
          <input type="number" id="${restId}" value="${defaultRests[idx - 1]}" min="0" max="6" step="1">
        </label><br>
      `;
    }
  });

  document.getElementById('goal-time').value = goalTime;
  recalculatePlan();
}

function recalculatePlan() {
  goalTime = parseInt(document.getElementById('goal-time').value);
  let rests = [
    0,
    parseInt(document.getElementById('rest1').value || 0),
    parseInt(document.getElementById('rest2').value || 0),
    parseInt(document.getElementById('rest3').value || 0),
    0
  ];

  let segments = [];
  for (let i = 0; i < aidStations.length - 1; i++) {
    const dist = aidStations[i + 1].km - aidStations[i].km;
    segments.push({ from: aidStations[i].name, to: aidStations[i + 1].name, distance: dist });
  }

  let totalRunTime = goalTime - rests.reduce((a, b) => a + b, 0);
  let paceRatios = [0.2, 0.32, 0.22, 0.26]; // Custom ratios to simulate slowing down
  let paces = segments.map((s, i) => {
    let segTime = totalRunTime * paceRatios[i];
    return {
      label: `${s.from} → ${s.to}`,
      pace: (s.distance / segTime).toFixed(2),
      hours: segTime.toFixed(1)
    };
  });

  // Draw chart
  const ctx = document.getElementById('paceChart').getContext('2d');
  if (paceChart) paceChart.destroy();
  paceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: paces.map(p => p.label),
      datasets: [{
        label: 'Pace (km/h)',
        data: paces.map(p => p.pace),
        backgroundColor: 'rgba(75, 192, 192, 0.7)'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              let hours = paces[context.dataIndex].hours;
              return `Pace: ${context.parsed.y} km/h (${hours} h)`;
            }
          }
        }
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'km/h' } }
      }
    }
  });
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  loadGPX('nuts300.gpx', initMap);
  document.getElementById('goal-time').addEventListener('input', recalculatePlan);
});
