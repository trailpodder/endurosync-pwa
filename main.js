import * as togeojson from './togeojson.js';

const map = L.map('map').setView([68.3, 23.5], 9);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
}).addTo(map);

fetch('nuts300.gpx')
  .then(response => response.text())
  .then(gpxText => {
    const gpxDoc = new DOMParser().parseFromString(gpxText, "application/xml");
    const geojson = togeojson.gpx(gpxDoc);

    const coords = geojson.features.flatMap(f =>
      f.geometry.coordinates.map(c => [c[1], c[0], c[2] || 0])
    );

    const latlngs = coords.map(c => [c[0], c[1]]);
    const elevations = coords.map(c => c[2] || 0);

    L.polyline(latlngs, { color: 'blue' }).addTo(map);
    map.fitBounds(latlngs);

    drawElevationChart(elevations);

    // Aid station definitions with distances
    const aidStations = [
      { name: "Kalmakaltio", km: 88, cutoff: "Tue 12:00" },
      { name: "Hetta", km: 192, cutoff: "Thu 13:00" },
      { name: "Pallas", km: 256, cutoff: "Fri 13:00" },
      { name: "Rauhala", km: 277, cutoff: null },
      { name: "Pahtavuoma", km: 288, cutoff: null },
      { name: "Peurakaltio", km: 301, cutoff: null },
      { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00" }
    ];

    aidStations.forEach(station => {
      const latlng = getLatLngAtKm(latlngs, station.km);
      if (!latlng) return;

      const marker = L.marker(latlng).addTo(map);
      const popup = `<b>${station.name}</b><br>${station.km} km` + (station.cutoff ? `<br>⏱️ Cutoff: ${station.cutoff}` : "");
      marker.bindPopup(popup);
    });
  })
  .catch(err => {
    console.error("Error loading GPX:", err);
  });

// Get LatLng by interpolating at a specific distance (km)
function getLatLngAtKm(latlngs, targetKm) {
  let dist = 0;
  for (let i = 1; i < latlngs.length; i++) {
    const prev = L.latLng(latlngs[i - 1]);
    const curr = L.latLng(latlngs[i]);
    const segDist = prev.distanceTo(curr) / 1000;
    if (dist + segDist >= targetKm) {
      const ratio = (targetKm - dist) / segDist;
      const lat = prev.lat + (curr.lat - prev.lat) * ratio;
      const lng = prev.lng + (curr.lng - prev.lng) * ratio;
      return [lat, lng];
    }
    dist += segDist;
  }
  return latlngs[latlngs.length - 1];
}

// Elevation chart with ECharts
function drawElevationChart(elevations) {
  const chart = echarts.init(document.getElementById('elevation-chart'));
  const data = elevations.map((e, i) => [i / 10, e]); // 1 point every 100m

  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value', name: 'Distance (km)' },
    yAxis: { type: 'value', name: 'Elevation (m)' },
    series: [{
      type: 'line',
      data,
      areaStyle: {},
      lineStyle: { color: '#4A90E2' }
    }]
  });
}

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log("✅ Service Worker registered"))
    .catch(err => console.error("Service Worker failed:", err));
}
