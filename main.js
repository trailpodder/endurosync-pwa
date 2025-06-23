import * as L from './leaflet.js';

const map = L.map("map").setView([68.3, 21.3], 8);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

fetch("nuts300.gpx")
  .then(res => res.text())
  .then(gpxText => {
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxText, "application/xml");
    const geojson = togeojson.gpx(gpxDoc);

    const coords = geojson.features[0].geometry.coordinates;
    const latlngs = coords.map(c => [c[1], c[0]]);
    const polyline = L.polyline(latlngs, { color: "blue" }).addTo(map);
    map.fitBounds(polyline.getBounds());

    const cumulativeDistances = [0];
    for (let i = 1; i < latlngs.length; i++) {
      const d = map.distance(latlngs[i - 1], latlngs[i]) / 1000;
      cumulativeDistances.push(cumulativeDistances[i - 1] + d);
    }

    function getLatLngAtKm(km) {
      for (let i = 1; i < cumulativeDistances.length; i++) {
        if (cumulativeDistances[i] >= km) return latlngs[i];
      }
      return latlngs[latlngs.length - 1];
    }

    const aidStations = [
      { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00", stopHrs: 0 },
      { name: "Kalmakaltio", km: 88, cutoff: "Tue 12:00", stopHrs: parseFloat(document.getElementById("stopKalmakaltio").value) },
      { name: "Hetta", km: 192, cutoff: "Thu 13:00", stopHrs: parseFloat(document.getElementById("stopHetta").value) },
      { name: "Pallas", km: 256, cutoff: "Fri 13:00", stopHrs: parseFloat(document.getElementById("stopPallas").value) },
      { name: "Rauhala", km: 277, cutoff: null, stopHrs: 0 },
      { name: "Pahtavuoma", km: 288, cutoff: null, stopHrs: 0 },
      { name: "Peurakaltio", km: 301, cutoff: null, stopHrs: 0 },
      { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00", stopHrs: 0 }
    ];

    aidStations.forEach(station => {
      const marker = L.marker(getLatLngAtKm(station.km)).addTo(map);
      const popup = `<b>${station.name}</b><br>km ${station.km}<br>Cutoff: ${station.cutoff || '—'}`;
      marker.bindPopup(popup);
    });

    function updatePlanner() {
      const goalHours = parseFloat(document.getElementById("goalHours").value);
      aidStations[1].stopHrs = parseFloat(document.getElementById("stopKalmakaltio").value);
      aidStations[2].stopHrs = parseFloat(document.getElementById("stopHetta").value);
      aidStations[3].stopHrs = parseFloat(document.getElementById("stopPallas").value);

      const totalStopTime = aidStations.reduce((sum, s) => sum + s.stopHrs, 0);
      const movingTime = goalHours - totalStopTime;
      const movingSpeed = 326 / movingTime;

      let output = `<table border="1" cellpadding="4"><tr>
        <th>Section</th><th>Distance (km)</th><th>Move Time (h)</th><th>Stop Time (h)</th><th>ETA</th></tr>`;
      
      let cumulativeTime = 0;
      const startDate = new Date("2025-09-01T12:00:00");

      for (let i = 0; i < aidStations.length - 1; i++) {
        const from = aidStations[i];
        const to = aidStations[i + 1];
        const dist = to.km - from.km;
        const moveHrs = dist / movingSpeed;
        cumulativeTime += moveHrs;
        cumulativeTime += from.stopHrs;
        const eta = new Date(startDate.getTime() + cumulativeTime * 3600 * 1000);
        const etaStr = eta.toLocaleString("en-GB", { hour12: false });
        output += `<tr><td>${from.name} → ${to.name}</td><td>${dist.toFixed(1)}</td>
          <td>${moveHrs.toFixed(2)}</td><td>${from.stopHrs}</td><td>${etaStr}</td></tr>`;
      }

      const finishStop = aidStations[aidStations.length - 1];
      output += `<tr><td>${finishStop.name}</td><td>-</td><td>-</td><td>${finishStop.stopHrs}</td><td>—</td></tr>`;
      output += `</table>`;

      document.getElementById("plannerOutput").innerHTML = output;
    }

    document.getElementById("updatePlan").addEventListener("click", updatePlanner);
    updatePlanner();

    // Elevation chart setup
    const chart = echarts.init(document.getElementById("elevation"));
    const elevationData = geojson.features[0].geometry.coordinates.map((c, i) => [
      cumulativeDistances[i],
      c[2] || 0
    ]);

    chart.setOption({
      xAxis: { type: "value", name: "Distance (km)" },
      yAxis: { type: "value", name: "Elevation (m)" },
      series: [{ type: "line", data: elevationData }],
      tooltip: { trigger: "axis" }
    });
  })
  .catch(err => console.error("Error loading GPX:", err));

// ✅ Register Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").then(() => {
    console.log("✅ Service Worker registered");
  });
}
