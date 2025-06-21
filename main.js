// main.js

let map;
let elevationChart;
let gpxLayer;

window.addEventListener("load", async () => {
  map = L.map("map").setView([68.3, 22.6], 8);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  try {
    const response = await fetch("nuts300.gpx");
    const gpxText = await response.text();

    const gpxDom = new DOMParser().parseFromString(gpxText, "text/xml");
    const geojson = toGeoJSON.gpx(gpxDom);

    gpxLayer = L.geoJSON(geojson).addTo(map);
    map.fitBounds(gpxLayer.getBounds());

    const points = geojson.features
      .flatMap(f => f.geometry.coordinates)
      .map((coord, index) => {
        const [lon, lat, ele] = coord;
        return { lat, lon, ele, dist: 0, index };
      });

    // Compute cumulative distance
    let totalDist = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].lat - points[i - 1].lat;
      const dy = points[i].lon - points[i - 1].lon;
      const d = Math.sqrt(dx * dx + dy * dy) * 111.32; // Approx km
      totalDist += d;
      points[i].dist = totalDist;
    }

    showElevationChart(points);
    placeAidStations(points);
  } catch (err) {
    console.error("Error loading GPX:", err);
  }

  // Register service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").then(() => {
      console.log("✅ Service Worker registered");
    });
  }
});

const aidStations = [
  { name: "Kalmakaltio", km: 88, cutoff: "Tue 12:00", type: "aid" },
  { name: "Hetta", km: 206, cutoff: "Thu 13:00", type: "aid" },
  { name: "Pallas", km: 261, cutoff: "Fri 13:00", type: "aid" },
  { name: "Rauhala", km: 284, type: "water" },
  { name: "Pahtavuoma", km: 295, type: "water" },
  { name: "Peurakaltio", km: 309, type: "water" },
  { name: "Finish", km: 326, cutoff: "Sat 18:00", type: "finish" },
];

function placeAidStations(points) {
  aidStations.forEach(station => {
    const closest = points.reduce((prev, curr) =>
      Math.abs(curr.dist - station.km) < Math.abs(prev.dist - station.km) ? curr : prev
    );
    L.marker([closest.lat, closest.lon], {
      icon: L.divIcon({
        className: "aid-marker",
        html: station.type === "water" ? "💧" : (station.type === "finish" ? "🏁" : "🩺"),
        iconSize: [24, 24],
      })
    }).addTo(map).bindPopup(
      `<b>${station.name}</b><br>${station.km} km${station.cutoff ? `<br>Cutoff: ${station.cutoff}` : ""}`
    );
  });
}

function showElevationChart(points) {
  const ctx = document.getElementById("chart").getContext("2d");
  const distances = points.map(p => p.dist.toFixed(1));
  const elevations = points.map(p => p.ele);

  const annotations = aidStations.map(station => ({
    type: 'line',
    scaleID: 'x',
    value: station.km,
    borderColor: station.type === "water" ? "blue" : (station.type === "finish" ? "green" : "red"),
    borderWidth: 1,
    label: {
      display: true,
      content: station.name,
      rotation: 0,
      color: '#333',
      backgroundColor: 'rgba(255,255,255,0.8)'
    }
  }));

  elevationChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: distances,
      datasets: [{
        label: "Elevation (m)",
        data: elevations,
        fill: false,
        borderColor: "orange",
        tension: 0.1,
      }],
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: "Distance (km)" } },
        y: { title: { display: true, text: "Elevation (m)" } }
      },
      plugins: {
        annotation: { annotations }
      }
    },
  });
}
