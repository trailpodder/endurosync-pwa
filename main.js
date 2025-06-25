// main.js
let map;
let elevationChart;

document.addEventListener("DOMContentLoaded", () => {
  map = L.map("map").setView([68.5, 22.5], 7);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
  }).addTo(map);

  fetch("nuts300.gpx")
    .then((res) => res.text())
    .then((gpxText) => {
      const parser = new DOMParser();
      const gpxDom = parser.parseFromString(gpxText, "application/xml");
      const geojson = toGeoJSON.gpx(gpxDom);

      if (!geojson.features || !geojson.features[0]) {
        throw new Error("No features found in GPX");
      }

      const track = geojson.features[0].geometry.coordinates.map(([lon, lat, ele]) => [lat, lon, ele]);

      const line = L.polyline(track.map(p => [p[0], p[1]]), { color: "blue" }).addTo(map);
      map.fitBounds(line.getBounds());

      showElevation(track);
      showPlanner(track);
    })
    .catch((err) => {
      console.error("Error loading GPX:", err);
    });

  document.getElementById("recalc").addEventListener("click", () => {
    const goalHours = parseFloat(document.getElementById("goal-time").value);
    showPlanner(null, goalHours);
  });
});

function showElevation(track) {
  const elevation = track.map((pt) => pt[2] || 0);
  const distance = track.map((_, i) => i * 0.05); // approx every 50m

  const chartDom = document.getElementById("elevation-chart");
  elevationChart = echarts.init(chartDom);
  elevationChart.setOption({
    xAxis: {
      type: "category",
      data: distance,
      name: "km",
    },
    yAxis: {
      type: "value",
      name: "elevation (m)",
    },
    series: [
      {
        data: elevation,
        type: "line",
        areaStyle: {},
        lineStyle: { width: 1 },
      },
    ],
    tooltip: {
      trigger: "axis",
    },
  });
}

function showPlanner(track, goalTime = 90) {
  const aidStations = [
    { name: "Start: Njurkulahti", km: 0, rest: 0 },
    { name: "Sioskuru", km: 22, rest: 0 },
    { name: "Kotikuru", km: 47, rest: 0 },
    { name: "Hannukuru", km: 73, rest: 0 },
    { name: "Pahakuru", km: 92, rest: 0 },
    { name: "Kalmakaltio", km: 124, rest: 1, cutoff: "Tue 23:00" },
    { name: "Hetta", km: 176, rest: 2, cutoff: "Wed 13:00" },
    { name: "Pallas", km: 238, rest: 3, cutoff: "Thu 07:00" },
    { name: "Finish", km: 326, rest: 0, cutoff: "Fri 06:00" },
  ];

  const tbody = document.querySelector("#plan-table tbody");
  tbody.innerHTML = "";

  let totalDist = 0;
  let totalTime = 0;

  for (let i = 1; i < aidStations.length; i++) {
    const prev = aidStations[i - 1];
    const curr = aidStations[i];
    const dist = curr.km - prev.km;
    const rest = curr.rest || 0;

    totalDist += dist;
  }

  // Total moving time without rest
  const totalRest = aidStations.reduce((sum, a) => sum + (a.rest || 0), 0);
  const movingTime = goalTime - totalRest;

  let sectionTimes = [];
  let timeAccum = 0;

  for (let i = 1; i < aidStations.length; i++) {
    const prev = aidStations[i - 1];
    const curr = aidStations[i];
    const dist = curr.km - prev.km;

    const sectionTime = dist / (totalDist / movingTime);
    const pace = dist / sectionTime;

    totalTime += sectionTime + (curr.rest || 0);
    sectionTimes.push({
      section: `${prev.name} → ${curr.name}`,
      rest: curr.rest || 0,
      dist: dist.toFixed(1),
      time: sectionTime.toFixed(1),
      pace: pace.toFixed(2),
    });
  }

  for (const sec of sectionTimes) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${sec.section}</td>
      <td>${sec.rest}</td>
      <td>${sec.dist}</td>
      <td>${sec.time}</td>
      <td>${sec.pace}</td>
    `;
    tbody.appendChild(row);
  }

  const sumRow = document.createElement("tr");
  sumRow.style.fontWeight = "bold";
  sumRow.innerHTML = `
    <td>Total</td>
    <td>${totalRest}</td>
    <td>${totalDist.toFixed(1)}</td>
    <td>${(totalTime).toFixed(1)}</td>
    <td>-</td>
  `;
  tbody.appendChild(sumRow);
}
