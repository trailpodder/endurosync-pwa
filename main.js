// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('✅ Service Worker registered'))
    .catch(err => console.error('❌ Service Worker error:', err));
}

// Initialize map
const map = L.map('map').setView([68.3, 23.7], 8); // Lapland view

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Load GPX file
fetch('nuts300.gpx')
  .then(res => res.text())
  .then(gpxText => {
    const parser = new DOMParser();
    const gpx = parser.parseFromString(gpxText, 'application/xml');
    const geojson = toGeoJSON.gpx(gpx);

    // Get track coordinates
    const coords = geojson.features[0].geometry.coordinates.map(c => L.latLng(c[1], c[0]));

    // Add route to map
    const polyline = L.polyline(coords, { color: 'blue', weight: 3 }).addTo(map);
    map.fitBounds(polyline.getBounds());

    // Elevation chart
    const elevationData = geojson.features[0].geometry.coordinates.map((c, i) => ({
      distance: i === 0 ? 0 : coords[i - 1].distanceTo(coords[i]) / 1000,
      elevation: c[2]
    }));
    for (let i = 1; i < elevationData.length; i++) {
      elevationData[i].distance += elevationData[i - 1].distance;
    }

    const chart = echarts.init(document.getElementById('chart'));
    chart.setOption({
      xAxis: { type: 'value', name: 'Distance (km)' },
      yAxis: { type: 'value', name: 'Elevation (m)' },
      series: [{
        type: 'line',
        data: elevationData.map(d => [d.distance, d.elevation]),
        smooth: true,
        lineStyle: { color: '#3b87f9' }
      }]
    });

    // Aid station definitions
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
      const latlng = getLatLngAtKm(coords, station.km);
      L.marker(latlng).addTo(map)
        .bindPopup(`<b>${station.name}</b><br>KM ${station.km}<br>${station.cutoff ?? "No cutoff"}`);
    });

  })
  .catch(err => console.error("Error loading GPX:", err));

function getLatLngAtKm(trackCoords, targetKm) {
  const targetMeters = targetKm * 1000;
  let accumulated = 0;

  for (let i = 1; i < trackCoords.length; i++) {
    const prev = trackCoords[i - 1];
    const curr = trackCoords[i];
    const segmentDistance = map.distance(prev, curr);

    if (accumulated + segmentDistance >= targetMeters) {
      const overshoot = targetMeters - accumulated;
      const ratio = overshoot / segmentDistance;

      const lat = prev.lat + (curr.lat - prev.lat) * ratio;
      const lng = prev.lng + (curr.lng - prev.lng) * ratio;
      return L.latLng(lat, lng);
    }

    accumulated += segmentDistance;
  }

  return trackCoords[trackCoords.length - 1]; // fallback to last point
}
