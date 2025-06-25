document.addEventListener("DOMContentLoaded", async () => {
  const goalInput = document.getElementById("goalTime");
  const recalcButton = document.getElementById("recalculate");
  const tableBody = document.querySelector("#planTable tbody");
  const totalKmCell = document.getElementById("totalKm");
  const totalTimeCell = document.getElementById("totalTime");

  const aidStations = [
    { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00", rest: 0 },
    { name: "Kalmakaltio", km: 88, cutoff: "Tue 12:00", rest: 1 },
    { name: "Hetta", km: 192, cutoff: "Thu 13:00", rest: 2 },
    { name: "Pallas", km: 256, cutoff: "Fri 13:00", rest: 3 },
    { name: "Rauhala", km: 277, cutoff: null, rest: 0 },
    { name: "Pahtavuoma", km: 288, cutoff: null, rest: 0 },
    { name: "Peurakaltio", km: 301, cutoff: null, rest: 0 },
    { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00", rest: 0 },
  ];

  let geojson;

  try {
    const res = await fetch("nuts300.gpx");
    const gpxText = await res.text();
    const parser = new DOMParser();
    const gpxDom = parser.parseFromString(gpxText, "application/xml");
    geojson = toGeoJSON.gpx(gpxDom);
  } catch (err) {
    console.error("Error loading GPX:", err);
    return;
  }

  // Map
  const map = L.map("map");
  const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
  tileLayer.addTo(map);
  const route = L.geoJSON(geojson).addTo(map);
  map.fitBounds(route.getBounds());

  // Elevation chart
  const chart = echarts.init(document.getElementById("chart"));
  const coords = geojson.features[0].geometry.coordinates;
  const elevationData = coords.map((c, i) => [i, c[2] || 0]);
  chart.setOption({
    xAxis: { type: "value", name: "Point" },
    yAxis: { type: "value", name: "Elevation (m)" },
    series: [{ type: "line", data: elevationData }]
  });

  // Add markers
  aidStations.forEach(station => {
    const coord = getLatLngAtKm(station.km, geojson);
    if (coord) {
      L.marker([coord[1], coord[0]]).addTo(map).bindPopup(`${station.name} (${station.km} km)`);
    }
  });

  function getLatLngAtKm(targetKm, geojson) {
    const coords = geojson.features[0].geometry.coordinates;
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
      const a = coords[i - 1], b = coords[i];
      const d = distance(a[1], a[0], b[1], b[0]);
      if (total + d >= targetKm) return b;
      total += d;
    }
    return coords[coords.length - 1];
  }

  function distance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function updatePlan() {
    const goalHours = parseFloat(goalInput.value);
    const totalRest = aidStations.reduce((sum, s) => sum + (s.rest || 0), 0);
    const movingTime = goalHours - totalRest;
    const totalKm = aidStations[aidStations.length - 1].km;

    tableBody.innerHTML = "";
    let timeSoFar = 0;
    let kmSoFar = 0;

    for (let i = 1; i < aidStations.length; i++) {
      const prev = aidStations[i - 1];
      const curr = aidStations[i];
      const segmentKm = curr.km - prev.km;
      const segmentTime = segmentKm / (totalKm / movingTime);
      const pace = segmentKm / segmentTime;
      const rest = curr.rest || 0;
      timeSoFar += segmentTime;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${prev.name} → ${curr.name}</td>
        <td>${segmentKm.toFixed(1)}</td>
        <td>${formatTime(segmentTime)}</td>
        <td>${pace.toFixed(2)}</td>
        <td>${formatTime(rest)}</td>
        <td>${curr.cutoff || ""}</td>
        <td><input type="text" placeholder="Notes" /></td>
      `;
      tableBody.appendChild(row);
    }

    totalKmCell.textContent = totalKm;
    totalTimeCell.textContent = formatTime(movingTime + totalRest);
  }

  function formatTime(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, "0")}`;
  }

  recalcButton.addEventListener("click", updatePlan);
  updatePlan();
});
