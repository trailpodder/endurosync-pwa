let map = L.map('map').setView([68.5, 21], 8);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Load and parse GPX file
fetch('nuts300.gpx')
  .then(response => response.text())
  .then(gpxText => {
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxText, "application/xml");
    const geojson = toGeoJSON.gpx(gpxDoc);
    const track = geojson.features[0];

    // Add route to map
    const routeLine = L.geoJSON(track, {
      style: { color: 'blue', weight: 3 }
    }).addTo(map);
    map.fitBounds(routeLine.getBounds());

    // Extract coordinates
    const coords = track.geometry.coordinates.map(c => L.latLng(c[1], c[0]));

    // Compute cumulative distances
    const distances = [0];
    for (let i = 1; i < coords.length; i++) {
      distances[i] = distances[i - 1] + coords[i - 1].distanceTo(coords[i]) / 1000;
    }

    // Function to get coordinate at approx. km
    function getLatLngAtKm(targetKm) {
      for (let i = 1; i < distances.length; i++) {
        if (distances[i] >= targetKm) {
          const prev = coords[i - 1];
          const curr = coords[i];
          const ratio = (targetKm - distances[i - 1]) / (distances[i] - distances[i - 1]);
          const lat = prev.lat + (curr.lat - prev.lat) * ratio;
          const lng = prev.lng + (curr.lng - prev.lng) * ratio;
          return [lat, lng];
        }
      }
      return coords[coords.length - 1];
    }

    // Aid station data
    const aidStations = [
      { name: "Kalmakaltio", km: 88, cutoff: "Tue 12:00" },
      { name: "Hetta", km: 192, cutoff: "Thu 13:00" },
      { name: "Pallas", km: 256, cutoff: "Fri 13:00" },
      { name: "Rauhala", km: 277, cutoff: null },
      { name: "Pahtavuoma", km: 288, cutoff: null },
      { name: "Peurakaltio", km: 301, cutoff: null },
      { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00" }
    ];

    // Add aid station markers
    aidStations.forEach(station => {
      const latlng = getLatLngAtKm(station.km);
      L.circleMarker(latlng, {
        radius: 6,
        color: 'red',
        fillColor: 'white',
        fillOpacity: 1,
        weight: 2
      }).addTo(map).bindPopup(`<strong>${station.name}</strong><br>Km ${station.km}<br>${station.cutoff ? "Cutoff: " + station.cutoff : ""}`);
    });

    // Elevation chart
    const chart = echarts.init(document.getElementById('chart'));
    const elevation = track.geometry.coordinates.map(c => c[2] || 0);
    const distance = distances;

    chart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: distance.map(d => d.toFixed(1)),
        name: 'Distance (km)',
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        name: 'Elevation (m)'
      },
      series: [{
        type: 'line',
        data: elevation,
        areaStyle: {},
        name: 'Elevation',
        smooth: true,
        lineStyle: { width: 1 }
      }]
    });
  })
  .catch(err => {
    console.error("Error loading GPX:", err);
  });

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log("✅ Service Worker registered"))
    .catch(err => console.error("Service Worker error:", err));
}
