// Initialize Leaflet map
const map = L.map('map').setView([68.56586, 24.11902], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '© OpenStreetMap'
}).addTo(map);

// Load and display GPX file automatically
fetch('nuts300.gpx')
  .then(res => {
    if (!res.ok) throw new Error('GPX file fetch failed.');
    return res.text();
  })
  .then(gpxText => {
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxText, 'application/xml');
    const geojson = toGeoJSON.gpx(gpxDoc);

    const gpxLayer = L.geoJSON(geojson, {
      style: { color: 'blue', weight: 3 }
    }).addTo(map);

    map.fitBounds(gpxLayer.getBounds());

    // Optional: Add start marker
    const coords = geojson.features[0].geometry.coordinates;
    const start = coords[0];
    const end = coords[coords.length - 1];
    L.marker([start[1], start[0]]).addTo(map).bindPopup("Start: Njurkulahti").openPopup();
    L.marker([end[1], end[0]]).addTo(map).bindPopup("Finish: Äkäslompolo");

  })
  .catch(err => {
    console.error('Error loading GPX:', err);
    alert('Could not load GPX route.');
  });
