// Aid stations with cutoff info
const aidStations = [
  { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00" },
  { name: "Kalmankaltio", km: 88, cutoff: "Tue 12:00", rest: 1 },
  { name: "Hetta", km: 192, cutoff: "Thu 13:00", rest: 2 },
  { name: "Pallas", km: 256, cutoff: "Fri 13:00", rest: 3 },
  { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00" }
];

// Static pacing plan for 96h total
const plan = [
  { segment: "Start – Kalmankaltio", dist: 88, run: 18, rest: 1, arrival: "Tue 06:00", cutoff: "Tue 12:00" },
  { segment: "Kalmankaltio – Hetta", dist: 104, run: 30, rest: 2, arrival: "Wed 13:00", cutoff: "Thu 13:00" },
  { segment: "Hetta – Pallas", dist: 64, run: 19, rest: 3, arrival: "Thu 10:00", cutoff: "Fri 13:00" },
  { segment: "Pallas – Finish", dist: 70, run: 23, rest: 0, arrival: "Fri 12:00", cutoff: "Sat 18:00" }
];

// Load GPX and convert to GeoJSON
async function loadGPX() {
  const response = await fetch('nuts300.gpx');
  const gpxText = await response.text();
  const parser = new DOMParser();
  const gpxDoc = parser.parseFromString(gpxText, "application/xml");
  return togeojson.gpx(gpxDoc); // lowercase "togeojson"
}

// Setup map and draw route
async function initMap() {
  const geojson = await loadGPX();
  const map = L.map('map');
  const gpxLayer = L.geoJSON(geojson);
  gpxLayer.addTo(map);
  map.fitBounds(gpxLayer.getBounds());

  // Add aid station markers
  aidStations.forEach((station, i) => {
    const marker = L.marker(gpxLayer.getBounds().getCenter(), {
      title: station.name
    }).addTo(map);
    marker.bindPopup(`<b>${station.name}</b><br>Cutoff: ${station.cutoff}`);
  });
}

// Setup table with pacing plan
function setupPlanner() {
  const tbody = document.querySelector('#planTable tbody');
  tbody.innerHTML = "";

  plan.forEach((seg, i) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${seg.segment}</td>
      <td>${seg.dist}</td>
      <td>${seg.run}</td>
      <td contenteditable="true">${seg.rest}</td>
      <td>${seg.arrival}</td>
      <td>${seg.cutoff}</td>
    `;
    tbody.appendChild(row);
  });
}

initMap();
setupPlanner();
