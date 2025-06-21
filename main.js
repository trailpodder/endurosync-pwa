// Initialize the map
const map = L.map('map').setView([68.4, 23.7], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Fetch and render GPX
fetch('nuts300.gpx')
  .then(response => {
    if (!response.ok) throw new Error('GPX fetch failed');
    return response.text();
  })
  .then(gpxText => {
    const parser = new DOMParser();
    const gpx = parser.parseFromString(gpxText, "application/xml");
    const geojson = toGeoJSON.gpx(gpx);

    const gpxLine = L.geoJSON(geojson, {
      style: { color: 'blue', weight: 3 }
    }).addTo(map);

    map.fitBounds(gpxLine.getBounds());

    // Add start and finish markers
    const coords = geojson.features[0].geometry.coordinates;
    const start = coords[0];
    const end = coords[coords.length - 1];

    L.marker([start[1], start[0]]).addTo(map).bindPopup("🏁 Start: Njurkulahti");
    L.marker([end[1], end[0]]).addTo(map).bindPopup("🎉 Finish: Äkäslompolo");
  })
  .catch(error => {
    console.error("GPX Load Error:", error);
    alert("Failed to load GPX route.");
  });
