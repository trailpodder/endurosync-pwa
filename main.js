// main.js

let map;
let chart;

window.addEventListener("DOMContentLoaded", async () => {
  map = L.map("map").setView([68.5, 21.0], 8);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
  }).addTo(map);

  try {
    const response = await fetch("nuts300.gpx");
    const gpxText = await response.text();
    const parser = new DOMParser();
    const gpxDom = parser.parseFromString(gpxText, "application/xml");
    const geojson = toGeoJSON.gpx(gpxDom);

    const route = geojson.features.find(f => f.geometry.type === "LineString");
    const coordinates = route.geometry.coordinates;

    // Calculate cumulative distances
    const distances = [0];
    for (let i = 1; i < coordinates.length; i++) {
      const [lon1, lat1] = coordinates[i - 1];
      const [lon2, lat2] = coordinates[i];
      const d = turf.distance(turf.point([lon1, lat1]), turf.point([lon2, lat2]));
      distances.push(distances[i - 1] + d);
    }

    // Aid station data
    const aidStations = [
      { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00", rest: 0 },
      { name: "Kalmakaltio", km: 88, cutoff: "Tue 12:00", rest: 1 },
      { name: "Hetta", km: 192, cutoff: "Thu 13:00", rest: 2 },
      { name: "Pallas", km: 256, cutoff: "Fri 13:00", rest: 3 },
      { name: "Rauhala", km: 277, cutoff: null, rest: 0 },
      { name: "Pahtavuoma", km: 288, cutoff: null, rest: 0 },
      { name: "Peurakaltio", km: 301, cutoff: null, rest: 0 },
      { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00", rest: 0 },
    ];

    const goalHours = parseFloat(document.getElementById("goalTime").value);
    const totalRest = aidStations.reduce((sum, s) => sum + (s.rest || 0), 0);
    const movingHours = goalHours - totalRest;
    const pace = 326 / movingHours;

    // Calculate arrival and departure times
    const plannerList = document.getElementById("plannerList");
    plannerList.innerHTML = "";

    const startTime = luxon.DateTime.fromFormat("2025-09-01 12:00", "yyyy-MM-dd HH:mm");
    let currentTime = startTime;

    for (let i = 0; i < aidStations.length; i++) {
      const a = aidStations[i];
      const prevKm = i === 0 ? 0 : aidStations[i - 1].km;
      const legDistance = a.km - prevKm;
      const legTime = legDistance / pace;
      currentTime = currentTime.plus({ hours: legTime });

      const arrival = currentTime;
      const departure = arrival.plus({ hours: a.rest || 0 });

      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${a.name}</strong><br>
        Distance: ${a.km} km<br>
        Arrival: ${arrival.toFormat("ccc HH:mm")}<br>
        Rest: ${a.rest || 0} h<br>
        Departure: ${departure.toFormat("ccc HH:mm")}<br>
        ${a.cutoff ? `Cutoff: ${a.cutoff} ${departure > luxon.DateTime.fromFormat(a.cutoff, "ccc HH:mm") ? '❌' : '✅'}` : ""}
      `;
      plannerList.appendChild(li);

      // Find nearest coordinate
      const idx = distances.findIndex(d => d >= a.km);
      if (idx !== -1) {
        const [lon, lat] = coordinates[idx];
        L.marker([lat, lon]).addTo(map).bindPopup(a.name);
      }

      currentTime = departure;
    }

    // Draw route
    const latlngs = coordinates.map(([lon, lat]) => [lat, lon]);
    L.polyline(latlngs, { color: "blue" }).addTo(map);
    map.fitBounds(L.polyline(latlngs).getBounds());

    // Elevation chart (dummy values)
    const elevation = geojson.features[0].properties.ele || [];
    chart = echarts.init(document.getElementById("elevation"));
    chart.setOption({
      xAxis: { type: "category", data: distances.map(d => d.toFixed(1)) },
      yAxis: { type: "value", name: "Elevation (m)" },
      series: [{
        type: "line",
        data: elevation,
      }],
      tooltip: { trigger: "axis" }
    });

  } catch (error) {
    console.error("Error loading GPX:", error);
  }

  // Service Worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then(() => {
      console.log("✅ Service Worker registered");
    });
  }
});
