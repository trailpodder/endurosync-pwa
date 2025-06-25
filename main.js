// main.js

let map;
let chart;

document.addEventListener("DOMContentLoaded", async () => {
  map = L.map("map").setView([68.5, 21.5], 8);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  try {
    const response = await fetch("nuts300.gpx");
    const gpxText = await response.text();
    const parser = new DOMParser();
    const gpxDom = parser.parseFromString(gpxText, "application/xml");
    const geojson = toGeoJSON.gpx(gpxDom);
    const coords = geojson.features[0].geometry.coordinates;

    const latlngs = coords.map(([lon, lat]) => [lat, lon]);
    const routeLine = L.polyline(latlngs, { color: "blue" }).addTo(map);
    map.fitBounds(routeLine.getBounds());

    const distances = computeDistances(latlngs);
    const cumDist = distances.reduce((acc, d) => {
      acc.push((acc.length ? acc[acc.length - 1] : 0) + d);
      return acc;
    }, []);

    const elevationData = geojson.features[0].properties.coordTimes.map(
      (_, i) => ({
        distance: cumDist[i],
        elevation: geojson.features[0].geometry.coordinates[i][2] || 0,
      })
    );

    const elevationChart = echarts.init(document.getElementById("elevation-chart"));
    chart = elevationChart;
    elevationChart.setOption({
      title: { text: "Elevation Profile" },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "value",
        name: "Distance (km)",
      },
      yAxis: {
        type: "value",
        name: "Elevation (m)",
      },
      series: [
        {
          type: "line",
          data: elevationData.map((d) => [d.distance, d.elevation]),
        },
      ],
    });

    setupPlanner(cumDist, latlngs);
  } catch (err) {
    console.error("Error loading GPX:", err);
  }
});

function computeDistances(latlngs) {
  const R = 6371;
  const dists = [0];
  for (let i = 1; i < latlngs.length; i++) {
    const [lat1, lon1] = latlngs[i - 1];
    const [lat2, lon2] = latlngs[i];
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    dists.push(R * c);
  }
  return dists;
}

function setupPlanner(cumDist, latlngs) {
  const aidStations = [
    { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00" },
    { name: "Kalmakaltio", km: 88, cutoff: "Tue 12:00" },
    { name: "Hetta", km: 192, cutoff: "Thu 13:00" },
    { name: "Pallas", km: 256, cutoff: "Fri 13:00" },
    { name: "Rauhala", km: 277, cutoff: null },
    { name: "Pahtavuoma", km: 288, cutoff: null },
    { name: "Peurakaltio", km: 301, cutoff: null },
    { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00" },
  ];

  const goalInput = document.getElementById("goal-time");
  const restInputs = document.querySelectorAll(".rest-time");
  const planTable = document.getElementById("plan-table");
  const recalcBtn = document.getElementById("recalc");

  function recalculatePlan() {
    const totalTime = parseFloat(goalInput.value); // in hours
    const restHours = Array.from(restInputs).map((el) => parseFloat(el.value));
    const moveTime = totalTime - restHours.reduce((a, b) => a + b, 0);

    const rows = Array.from(planTable.querySelectorAll("tbody tr"));
    const sectionTimes = [];
    const totalDist = aidStations[aidStations.length - 1].km;

    // Time per km:
    const pace = moveTime / totalDist;

    // Compute plan:
    let timeSoFar = 0;
    let distSoFar = 0;
    rows.forEach((row, i) => {
      if (i === 0) return; // skip header
      const aidIndex = i - 1;
      const dist = aidStations[aidIndex + 1].km - aidStations[aidIndex].km;
      const sectionTime = pace * dist;
      const rest = parseFloat(restInputs[aidIndex].value || 0);

      const paceKmh = (dist / sectionTime).toFixed(2);
      row.children[2].textContent = dist.toFixed(1);
      row.children[3].textContent = sectionTime.toFixed(1);
      row.children[4].textContent = paceKmh;
      timeSoFar += sectionTime + rest;
    });

    // Summary row
    const summaryRow = planTable.querySelector("tfoot tr");
    summaryRow.children[1].textContent = totalDist.toFixed(1);
    summaryRow.children[2].textContent = moveTime.toFixed(1);
    summaryRow.children[3].textContent = totalTime.toFixed(1);
  }

  // Initial render
  const tbody = planTable.querySelector("tbody");
  tbody.innerHTML = "";
  for (let i = 0; i < aidStations.length - 1; i++) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${aidStations[i].name} → ${aidStations[i + 1].name}</td>
      <td><input type="number" class="rest-time" value="${[1,2,3,0,0,0,0][i]}" /></td>
      <td></td><td></td><td></td>
    `;
    tbody.appendChild(row);
  }

  // Add summary row
  const tfoot = document.createElement("tfoot");
  tfoot.innerHTML = `
    <tr>
      <th>Total</th><th></th>
      <td></td><td></td><td></td>
    </tr>`;
  planTable.appendChild(tfoot);

  recalcBtn.addEventListener("click", recalculatePlan);
  recalculatePlan();

  // Show markers
  aidStations.forEach((a) => {
    const closest = latlngs.reduce((prev, curr, i) => {
      const dist = Math.abs(cumDist[i] - a.km);
      return dist < prev.dist ? { idx: i, dist } : prev;
    }, { idx: 0, dist: Infinity });
    const latlng = latlngs[closest.idx];
    L.marker(latlng).addTo(map).bindPopup(`${a.name} (${a.km} km)`);
  });
}
