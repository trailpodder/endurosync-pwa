const aidStations = [
  { name: "Start: Njurkulahti", km: 0, cutoff: "2025-08-11T12:00:00+03:00" },
  { name: "Kalmakaltio", km: 88, cutoff: "2025-08-12T12:00:00+03:00" },
  { name: "Hetta", km: 174, cutoff: "2025-08-13T12:00:00+03:00" },
  { name: "Pallas", km: 230, cutoff: "2025-08-14T00:00:00+03:00" },
  { name: "Finish: Ylläs", km: 326, cutoff: "2025-08-15T06:00:00+03:00" },
];

// Estimated difficulty multipliers per section (terrain/fatigue)
const paceModifiers = [1.0, 1.1, 1.2, 1.15];

const gpxUrl = "nuts300.gpx";
let chart, map, geojson;

// Initialize map
map = L.map("map").setView([68.3, 23.7], 8);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
}).addTo(map);

// Load GPX and render
fetch(gpxUrl)
  .then(res => res.text())
  .then(gpxText => {
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxText, "application/xml");
    geojson = toGeoJSON.gpx(gpxDoc);
    const gpxLine = L.geoJSON(geojson).addTo(map);
    map.fitBounds(gpxLine.getBounds());
    addAidMarkers();
    drawElevationChart();
    buildPacePlan();
  })
  .catch(err => console.error("Error loading GPX:", err));

// Add aid station markers
function addAidMarkers() {
  aidStations.forEach(station => {
    const pt = geojson.features[0].geometry.coordinates.find(
      (coord, i) =>
        geojson.features[0].properties.coordTimes &&
        i === 0 || // crude matching based on distance index
        Math.abs(coord[0] - station.lon) < 0.1
    );
    if (pt) {
      L.marker([pt[1], pt[0]]).addTo(map).bindPopup(`${station.name} (${station.km} km)`);
    }
  });
}

// Draw elevation chart
function drawElevationChart() {
  const coords = geojson.features[0].geometry.coordinates;
  const elevations = geojson.features[0].properties.coordTimes?.map((t, i) => ({
    distance: i * 0.1, // placeholder, should be actual distance
    elevation: coords[i]?.[2] || 0,
  })) || [];

  chart = echarts.init(document.getElementById("chart"));
  chart.setOption({
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: elevations.map(e => e.distance.toFixed(1)) },
    yAxis: { type: "value", name: "Elevation (m)" },
    series: [{ type: "line", data: elevations.map(e => e.elevation), smooth: true }]
  });
}

// Pace planner
function buildPacePlan() {
  const goal = parseFloat(document.getElementById("goalTime").value);
  const restK = parseFloat(document.getElementById("restKalmakaltio").value);
  const restH = parseFloat(document.getElementById("restHetta").value);
  const restP = parseFloat(document.getElementById("restPallas").value);
  const restTimes = [0, restK, restH, restP, 0];

  const totalRest = restTimes.reduce((a, b) => a + b, 0);
  const movingTime = goal - totalRest;

  const sections = [];
  let totalDistance = 0;
  let totalMovingTime = 0;

  for (let i = 1; i < aidStations.length; i++) {
    const dist = aidStations[i].km - aidStations[i - 1].km;
    const mod = paceModifiers[i - 1];
    const rawTime = dist / 326 * movingTime * mod;
    const pace = dist / rawTime;
    totalDistance += dist;
    totalMovingTime += rawTime;

    sections.push({
      name: `${aidStations[i - 1].name} → ${aidStations[i].name}`,
      dist: dist,
      time: rawTime,
      pace: pace,
      rest: restTimes[i]
    });
  }

  const tbody = document.querySelector("#planTable tbody");
  tbody.innerHTML = "";
  sections.forEach(s => {
    const row = `<tr>
      <td>${s.name}</td>
      <td>${s.dist.toFixed(1)}</td>
      <td>${formatHours(s.time)}</td>
      <td>${s.pace.toFixed(2)}</td>
      <td>${s.rest}</td>
    </tr>`;
    tbody.insertAdjacentHTML("beforeend", row);
  });

  document.getElementById("totalDistance").textContent = totalDistance.toFixed(1);
  document.getElementById("totalTime").textContent = formatHours(totalMovingTime);
  document.getElementById("avgPace").textContent = (totalDistance / totalMovingTime).toFixed(2);
  document.getElementById("totalRest").textContent = totalRest;
}

// Format hours to HH:MM
function formatHours(h) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${mins}m`;
}

// Recalculate button
document.getElementById("recalculate").addEventListener("click", buildPacePlan);
