// Initialize Leaflet map
const map = L.map('map').setView([68.4, 23.7], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Load the GPX file using blob
fetch('nuts300.gpx')
  .then(response => {
    if (!response.ok) throw new Error('GPX fetch failed');
    return response.blob();
  })
  .then(blob => {
    return blob.text(); // Convert blob to text
  })
  .then(gpxText => {
    const parser = new DOMParser();
    const gpx = parser.parseFromString(gpxText, "application/xml");
    const geojson = toGeoJSON.gpx(gpx);

    const gpxLayer = L.geoJSON(geojson, {
      style: { color: 'blue', weight: 3 }
    }).addTo(map);

    map.fitBounds(gpxLayer.getBounds());

    // Mark start and finish
    const coords = geojson.features[0].geometry.coordinates;
    const start = coords[0];
    const end = coords[coords.length - 1];
    L.marker([start[1], start[0]]).addTo(map).bindPopup("🏁 Start: Njurkulahti");
    L.marker([end[1], end[0]]).addTo(map).bindPopup("🎉 Finish: Äkäslompolo");
  })
  .catch(err => {
    console.error("Could not load GPX:", err);
    alert("Error loading route. See console for details.");
  });
