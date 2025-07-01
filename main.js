const aidStations = [
  { name: "Start", km: 0 },
  { name: "Kalmankaltio", km: 88 },
  { name: "Hetta", km: 192 },
  { name: "Pallas", km: 256 },
  { name: "Finish", km: 326 }
];

let map, routeLine, paceChart, elevationData = [];

async function loadGPX(url) {
  const res = await fetch(url);
  const text = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "application/xml");
  const geojson = togeojson.gpx(doc);
  return geojson;
}

function computeDistances(coords) {
  let total = 0, dists = [0];
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i-1][0];
    const dy = coords[i][1] - coords[i-1][1];
    const dist = Math.sqrt(dx*dx + dy*dy) * 111.32; // Approx km
    total += dist;
    dists.push(total);
  }
  return dists;
}

function getAidStationCoords(coords, dists) {
  return aidStations.map(station => {
    let idx = dists.findIndex(d => d >= station.km);
    return { ...station, coord: coords[idx] };
  });
}

function recalculatePlan() {
  const goalH = parseFloat(document.getElementById('goalTime').value);
  const r1 = parseFloat(document.getElementById('rest1').value);
  const r2 = parseFloat(document.getElementById('rest2').value);
  const r3 = parseFloat(document.getElementById('rest3').value);

  const runTimes = [
    18,   // Start -> Kalman
    30,   // Kalman -> Hetta
    19,   // Hetta -> Pallas
    23    // Pallas -> Finish
  ];

  const rests = [r1, r2, r3];
  const segments = [];
  let t = 0;
  for (let i = 0; i < runTimes.length; i++) {
    segments.push({ from: aidStations[i].name, to: aidStations[i+1].name, time: runTimes[i], start: t });
    t += runTimes[i];
    if (i < rests.length) t += rests[i];
  }

  // Update chart
  const labels = segments.map(s => `${s.from}→${s.to}`);
  const times = segments.map(s => s.time);
  const cumu = segments.map(s => s.start + s.time);

  if (paceChart) paceChart.destroy();
  paceChart = new Chart(document.getElementById('paceChart'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Segment Run Time (h)',
        data: times,
        backgroundColor: 'steelblue'
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: `Arrival at Finish: ${t.toFixed(1)} h (Goal: ${goalH} h)`
        }
      },
      scales: {
        y: { title: { display: true, text: 'Hours' } }
      }
    }
  });
}

async function initMap() {
  const geojson = await loadGPX("nuts300.gpx");
  const coords = geojson.features[0].geometry.coordinates;
  const latlngs = coords.map(c => [c[1], c[0]]);
  const dists = computeDistances(coords);

  map = L.map("map").setView(latlngs[0], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  routeLine = L.polyline(latlngs, { color: "darkred" }).addTo(map);
  map.fitBounds(routeLine.getBounds());

  // Aid stations
  const aidWithCoords = getAidStationCoords(coords, dists);
  aidWithCoords.forEach(station => {
    if (station.name !== "Start" && station.name !== "Finish") {
      L.marker([station.coord[1], station.coord[0]])
        .addTo(map)
        .bindPopup(`${station.name} (${station.km} km)`);
    }
  });

  recalculatePlan();
}

document.getElementById('recalcBtn').addEventListener('click', recalculatePlan);
initMap();
