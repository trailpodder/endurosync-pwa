// No import of Chart needed, it's global

const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: 0 },
  { name: "Kalmakaltio", km: 88, cutoff: 24 },
  { name: "Hetta", km: 192, cutoff: 73 },
  { name: "Pallas", km: 256, cutoff: 97 },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: 126 }
];

let map, routeLine;

async function loadGPX() {
  const res = await fetch("nuts300.gpx");
  const text = await res.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "application/xml");
  const geojson = togeojson.gpx(xml);
  return geojson;
}

async function initMap() {
  map = L.map("map").setView([68.3, 22.5], 8);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

  const gpxData = await loadGPX();
  routeLine = L.geoJSON(gpxData, { style: { color: "blue" } }).addTo(map);
  map.fitBounds(routeLine.getBounds());

  aidStations.forEach((pt) => {
    if (pt.km === 0 || pt.km === 326 || pt.cutoff > 0) {
      L.marker(getLatLngAtDistance(gpxData, pt.km))
        .addTo(map)
        .bindPopup(pt.name);
    }
  });

  recalculatePlan();
}

function getLatLngAtDistance(geojson, targetKm) {
  let total = 0;
  const coords = geojson.features[0].geometry.coordinates;
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    const dist = haversine(lat1, lon1, lat2, lon2);
    total += dist;
    if (total >= targetKm) return [lat2, lon2];
  }
  return [coords[coords.length - 1][1], coords[coords.length - 1][0]];
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function recalculatePlan() {
  const goal = Number(document.getElementById("goalTime").value);
  const rest1 = Number(document.getElementById("rest1").value);
  const rest2 = Number(document.getElementById("rest2").value);
  const rest3 = Number(document.getElementById("rest3").value);
  const rests = [0, rest1, rest2, rest3, 0];

  const output = [];
  const segments = [];

  for (let i = 0; i < aidStations.length - 1; i++) {
    const from = aidStations[i];
    const to = aidStations[i + 1];
    const segmentDist = to.km - from.km;
    const cutoffTime = to.cutoff;
    const plannedArrival = segments.reduce((acc, s) => acc + s.total, 0);
    const maxTime = cutoffTime - 1 - rests[i + 1]; // leave 1h buffer + rest
    const segmentTime = maxTime - plannedArrival;
    const pace = segmentDist / segmentTime;

    segments.push({
      from: from.name,
      to: to.name,
      dist: segmentDist,
      time: segmentTime,
      pace: pace.toFixed(2),
      rest: rests[i + 1],
      total: segmentTime + rests[i + 1]
    });
  }

  const lines = segments.map((s) =>
    `${s.from} → ${s.to}: ${s.dist} km in ${s.time.toFixed(2)} h, rest ${s.rest} h → pace ${s.pace} km/h`
  );
  document.getElementById("output").textContent = lines.join("\n");

  const ctx = document.getElementById("paceChart").getContext("2d");
  if (window.paceChart) window.paceChart.destroy();
  window.paceChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: segments.map((s) => s.to),
      datasets: [
        {
          label: "Pace (km/h)",
          data: segments.map((s) => s.pace),
          backgroundColor: "rgba(75,192,192,0.6)"
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "km/h" } }
      }
    }
  });
}

initMap();
