// Initialize the Leaflet map
const map = L.map('map').setView([68.3, 23.7], 8); // Centered in northern Finland

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Load and parse GPX file
fetch('nuts300.gpx')
  .then(response => {
    if (!response.ok) throw new Error('GPX fetch failed');
    return response.text();
  })
  .then(gpxText => {
    const parser = new DOMParser();
    const gpx = parser.parseFromString(gpxText, "application/xml");
    const geojson = toGeoJSON.gpx(gpx);

    // Draw GPX route on map
    const gpxLayer = L.geoJSON(geojson, {
      style: { color: 'blue', weight: 3 }
    }).addTo(map);

    map.fitBounds(gpxLayer.getBounds());

    const coords = geojson.features[0].geometry.coordinates;

    // Add start and finish markers
    const start = coords[0];
    const end = coords[coords.length - 1];
    L.marker([start[1], start[0]]).addTo(map).bindPopup("🏁 Start: Njurkulahti");
    L.marker([end[1], end[0]]).addTo(map).bindPopup("🎉 Finish: Äkäslompolo");

    // Aid stations and water points
    const stations = [
      { name: "Kalmakaltio", km: 88, cutoff: "Tue 12:00" },
      { name: "Hetta", km: 206, cutoff: "Thu 13:00" },
      { name: "Pallas", km: 261, cutoff: "Fri 13:00" },
      { name: "Rauhala", km: 284 },
      { name: "Pahtavuoma", km: 295 },
      { name: "Peurakaltio", km: 309 },
      { name: "Finish", km: 326, cutoff: "Sat 18:00" }
    ];

    // Approximate lat/lng at given distance
    function getLatLngAtKm(targetKm) {
      let total = 0;
      let prev = coords[0];
      for (let i = 1; i < coords.length; i++) {
        const curr = coords[i];
        const dx = curr[0] - prev[0];
        const dy = curr[1] - prev[1];
        const dist = Math.sqrt(dx * dx + dy * dy) * 111; // rough km conversion
        total += dist;
        if (total >= targetKm) return [curr[1], curr[0]];
        prev = curr;
      }
      return [coords[coords.length - 1][1], coords[coords.length - 1][0]];
    }

    // Add station markers to the map
    stations.forEach(station => {
      const latlng = getLatLngAtKm(station.km);
      const icon = L.divIcon({ className: 'station-icon', html: '🚩' });
      const popup = `<b>${station.name}</b><br>km ${station.km}` +
        (station.cutoff ? `<br>⏰ Cutoff: ${station.cutoff}` : '');
      L.marker(latlng, { icon }).addTo(map).bindPopup(popup);
    });
  })
  .catch(error => {
    console.error("Error loading GPX:", error);
  });
