// main.js

// Create the map
const map = L.map('map').setView([68.5, 21.5], 9);

// Add tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 17,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Fetch GPX file and load it
fetch('nuts300.gpx')
  .then(response => response.text())
  .then(gpxText => {
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxText, 'application/xml');
    const geojson = toGeoJSON.gpx(gpxDoc);

    const trackCoords = geojson.features[0].geometry.coordinates;

    // Draw the route
    const route = L.polyline(trackCoords.map(c => [c[1], c[0]]), { color: 'blue' }).addTo(map);
    map.fitBounds(route.getBounds());

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

    // Helper: Compute total GPX length in km
    function haversine(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const toRad = deg => deg * Math.PI / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Compute cumulative distance along GPX track
    let cumulativeDistance = 0;
    const distPoints = trackCoords.map((coord, i) => {
      if (i > 0) {
        cumulativeDistance += haversine(
          trackCoords[i - 1][1], trackCoords[i - 1][0],
          coord[1], coord[0]
        );
      }
      return {
        lat: coord[1],
        lon: coord[0],
        km: cumulativeDistance
      };
    });

    // Find nearest track point for each aid station by km
    aidStations.forEach(station => {
      let nearest = distPoints.reduce((prev, curr) =>
        Math.abs(curr.km - station.km) < Math.abs(prev.km - station.km) ? curr : prev
      );

      const marker = L.marker([nearest.lat, nearest.lon]).addTo(map);
      marker.bindPopup(
        `<strong>${station.name}</strong><br>Km ${station.km}<br>` +
        (station.cutoff ? `⏱ Cutoff: ${station.cutoff}` : '✅ No cutoff')
      );
    });

  })
  .catch(err => console.error('Error loading GPX:', err));

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('✅ Service Worker registered'))
    .catch(err => console.error('Service Worker registration failed:', err));
}
