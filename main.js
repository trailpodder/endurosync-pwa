// main.js
// No import – toGeoJSON is included as a script in index.html

document.addEventListener("DOMContentLoaded", () => {
  const map = L.map("map").setView([68.5, 21], 9);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  // Aid station data
  const aidStations = [
    { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00", rest: 0 },
    { name: "Kalmankaltio", km: 88, cutoff: "Tue 12:00", rest: 1 },
    { name: "Hetta", km: 192, cutoff: "Thu 13:00", rest: 2 },
    { name: "Pallas", km: 256, cutoff: "Fri 13:00", rest: 3 },
    { name: "Rauhala (water)", km: 277, cutoff: "", rest: 0 },
    { name: "Pahtavuoma (water)", km: 288, cutoff: "", rest: 0 },
    { name: "Peurakaltio (water)", km: 301, cutoff: "", rest: 0 },
    { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00", rest: 0 },
  ];

  const icon = L.icon({
    iconUrl: 'favicon.ico',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  fetch("nuts300.gpx")
    .then((res) => res.text())
    .then((gpxText) => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(gpxText, "application/xml");
      const geojson = toGeoJSON.gpx(xml);

      const route = L.geoJSON(geojson, {
        style: { color: "blue", weight: 3 },
      }).addTo(map);

      map.fitBounds(route.getBounds());

      const routeLine = geojson.features.find(f => f.geometry.type === "LineString");
      const coords = routeLine.geometry.coordinates;

      // Elevation chart
      const elevation = coords.map((c, i) => ({
        dist: i * 0.05, // estimate 50 m per point
        ele: c[2] || 0,
      }));

      const chart = echarts.init(document.getElementById("chart"));
      chart.setOption({
        tooltip: {},
        xAxis: { type: "value", name: "km" },
        yAxis: { type: "value", name: "m" },
        series: [{
          type: "line",
          data: elevation.map(p => [p.dist, p.ele]),
          smooth: true
        }]
      });

      // Place aid station markers at nearest coordinate
      aidStations.forEach(station => {
        let closest = coords.reduce((prev, curr) =>
          Math.abs(curr[2] - station.km) < Math.abs(prev[2] - station.km) ? curr : prev
        );
        L.marker([closest[1], closest[0]], { icon }).addTo(map)
          .bindPopup(`${station.name}<br>${station.km} km<br>Cutoff: ${station.cutoff}`);
      });

      buildPlanner(aidStations);
    })
    .catch((err) => console.error("Error loading GPX:", err));
});

// Build pacing planner
function buildPlanner(aidStations) {
  const table = document.getElementById("planner-body");
  const totalTimeInput = document.getElementById("goal-time");
  const recalcBtn = document.getElementById("recalc");

  function recalculate() {
    table.innerHTML = "";
    const totalTime = parseFloat(totalTimeInput.value);
    const restTimes = aidStations.map((_, i) =>
      parseFloat(document.getElementById(`rest-${i}`)?.value || 0)
    );

    // Section calculations
    let totalDist = 0;
    let totalHours = 0;

    for (let i = 1; i < aidStations.length; i++) {
      const from = aidStations[i - 1];
      const to = aidStations[i];
      const sectionDist = to.km - from.km;

      // Determine max allowed time for this section
      let maxSectionTime;
      if (to.cutoff) {
        const cutoffHours = cutoffToHours(to.cutoff);
        maxSectionTime = cutoffHours - totalHours - restTimes[i - 1] - 1;
      } else {
        maxSectionTime = (totalTime - totalHours - restTimes[i - 1]) * (sectionDist / (aidStations[aidStations.length - 1].km - from.km));
      }

      const pace = sectionDist / maxSectionTime;
      const sectionTime = sectionDist / pace;

      totalDist += sectionDist;
      totalHours += sectionTime + restTimes[i - 1];

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${from.name} → ${to.name}</td>
        <td>${sectionDist.toFixed(1)} km</td>
        <td>${sectionTime.toFixed(2)} h</td>
        <td>${pace.toFixed(2)} km/h</td>
        <td><input type="number" id="rest-${i}" value="${restTimes[i] || 0}" min="0" step="0.5" style="width:50px"></td>
        <td>${to.cutoff || "-"}</td>
      `;
      table.appendChild(row);
    }

    const summary = document.getElementById("summary");
    summary.innerHTML = `<strong>Total: ${totalDist.toFixed(1)} km, ${totalHours.toFixed(2)} h</strong>`;
  }

  recalcBtn.addEventListener("click", recalculate);
  recalculate();
}

// Converts cutoff like "Tue 12:00" to hours from Mon 12:00
function cutoffToHours(label) {
  const days = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5 };
  const [dayStr, timeStr] = label.split(" ");
  const day = days[dayStr];
  const [h, m] = timeStr.split(":").map(Number);
  return day * 24 + h + m / 60;
}
