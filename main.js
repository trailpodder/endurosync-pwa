const map = L.map('map').setView([68.75, 26.22], 10);

// Base map
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Load GPX route
fetch('nuts300.gpx')
  .then(res => res.text())
  .then(gpxText => {
    const gpx = new DOMParser().parseFromString(gpxText, 'application/xml');
    new L.GPX(gpx, {
      async: true,
      marker_options: {
        startIconUrl: null,
        endIconUrl: null,
        shadowUrl: null
      }
    }).on('loaded', function(e) {
      map.fitBounds(e.target.getBounds());
    }).addTo(map);
  });

// Aid stations
const aidStations = [
  {
    name: "Kalmakaltio",
    km: 88,
    lat: 68.421, lon: 25.267,
    cutoff: "Tuesday 12:00 (24h)"
  },
  {
    name: "Hetta",
    km: 206,
    lat: 68.384, lon: 23.634,
    cutoff: "Thursday 13:00 (73h)"
  },
  {
    name: "Pallas",
    km: 261,
    lat: 68.060, lon: 24.070,
    cutoff: "Friday 13:00 (97h)"
  },
  {
    name: "Rauhala", km: 284, lat: 67.96, lon: 24.21, cutoff: null
  },
  {
    name: "Pahtavuoma", km: 295, lat: 67.87, lon: 24.23, cutoff: null
  },
  {
    name: "Peurakaltio", km: 309, lat: 67.73, lon: 24.18, cutoff: null
  },
  {
    name: "Finish / Äkäslompolo",
    km: 326,
    lat: 67.604, lon: 24.153,
    cutoff: "Saturday 18:00 (126h)"
  }
];

aidStations.forEach(station => {
  const marker = L.marker([station.lat, station.lon]).addTo(map);
  let popup = `<b>${station.name}</b><br>${station.km} km`;
  if (station.cutoff) popup += `<br>Cut-off: ${station.cutoff}`;
  marker.bindPopup(popup);
});


// Add markers
aidStations.forEach(station => {
  const marker = L.marker([station.lat, station.lon]).addTo(map);
  const info = `<b>${station.name}</b><br>${station.km} km` +
               (station.cutoff ? `<br>⏱ Cutoff: ${station.cutoff}` : '');
  marker.bindPopup(info);
});
