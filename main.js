const aidStations = [
  { name: "Start (Njurgulahti)", km: 0 },
  { name: "Kalmankaltio", km: 88, rest: 1, cutoff: 24 },
  { name: "Hetta", km: 192, rest: 2, cutoff: 73 },
  { name: "Pallas", km: 256, rest: 3, cutoff: 97 },
  { name: "Finish (Äkäslompolo)", km: 326, rest: 0, cutoff: 126 }
];

let map, paceChart, trackLine;

function initMap() {
  map = L.map('map').setView([68.0, 23.5], 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  aidStations.forEach(s => {
    if (s.name.includes("Start") || s.name.includes("Finish") || s.cutoff) {
      L.marker([0, 0]) // placeholder, set correct lat/lon after GPX loaded
        .addTo(map)
        .bindPopup(`${s.name} (${s.km} km)`);
    }
  });

  loadGPX("nuts300.gpx");
}

async function loadGPX(file) {
  const xml = await fetchGPX(file);
  const geojson = togeojson.gpx(xml);

  const coords = geojson.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
  if (trackLine) map.removeLayer(trackLine);
  trackLine = L.polyline(coords, { color: 'blue' }).addTo(map);
  map.fitBounds(trackLine.getBounds());

  recalculatePlan();
}

function recalculatePlan() {
  const goalTime = parseFloat(document.getElementById("goal-time").value);
  const restControls = document.getElementById("rest-controls");
  restControls.innerHTML = '';

  const movingTime = goalTime - aidStations.reduce((sum, s) => sum + (s.rest || 0), 0);
  const totalDist = aidStations[aidStations.length - 1].km;

  const segments = [];
  for (let i = 1; i < aidStations.length; i++) {
    const dist = aidStations[i].km - aidStations[i - 1].km;
    const ratio = dist / totalDist;
    const moveHours = movingTime * ratio;
    segments.push({
      from: aidStations[i - 1].name,
      to: aidStations[i].name,
      distance: dist,
      time: moveHours.toFixed(1)
    });

    // Editable rest control
    if (aidStations[i].rest !== undefined) {
      const input = document.createElement("input");
      input.type = "number";
      input.value = aidStations[i].rest;
      input.min = 0;
      input.max = 5;
      input.step = 0.5;
      input.dataset.index = i;
      input.addEventListener("change", () => {
        aidStations[i].rest = parseFloat(input.value);
        recalculatePlan();
      });
      restControls.append(`Rest at ${aidStations[i].name}: `, input, "h", document.createElement("br"));
    }
  }

  drawChart(segments);
}

function drawChart(segments) {
  const labels = segments.map(s => `${s.from} → ${s.to}`);
  const times = segments.map(s => parseFloat(s.time));

  if (paceChart) {
    paceChart.destroy();
  }

  const ctx = document.getElementById('paceChart').getContext('2d');
  paceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Estimated Segment Time (hours)',
        data: times,
        backgroundColor: 'rgba(75, 192, 192, 0.6)'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          title: { display: true, text: 'Hours' },
          beginAtZero: true
        }
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", initMap);
