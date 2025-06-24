// main.js

document.addEventListener("DOMContentLoaded", async () => {
  const map = L.map('map').setView([68.0, 23.5], 7); // Finland north view

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  try {
    const response = await fetch('nuts300.gpx');
    if (!response.ok) throw new Error('GPX file failed to load');

    const gpxText = await response.text();
    const parser = new DOMParser();
    const gpxDom = parser.parseFromString(gpxText, 'application/xml');
    const geojson = toGeoJSON.gpx(gpxDom);

    const track = geojson.features.find(f => f.geometry && f.geometry.type === 'LineString');
    if (!track) throw new Error('No LineString track found in GPX');

    const coords = track.geometry.coordinates.map(c => [c[1], c[0]]);
    const polyline = L.polyline(coords, { color: 'blue' }).addTo(map);
    map.fitBounds(polyline.getBounds());

    // Aid station data
    const aidStations = [
      { name: "Start (Njurgulahti)", km: 0, cutoff: "Mon 12:00", rest: 0 },
      { name: "Kalmakaltio", km: 88, cutoff: "Tue 12:00", rest: 1 },
      { name: "Hetta", km: 192, cutoff: "Thu 13:00", rest: 2 },
      { name: "Pallas", km: 256, cutoff: "Fri 13:00", rest: 3 },
      { name: "Rauhala", km: 277, cutoff: null, rest: 0 },
      { name: "Pahtavuoma", km: 288, cutoff: null, rest: 0 },
      { name: "Peurakaltio", km: 301, cutoff: null, rest: 0 },
      { name: "Finish (Äkäslompolo)", km: 326, cutoff: "Sat 18:00", rest: 0 }
    ];

    function getLatLngAtKm(targetKm) {
      let totalDist = 0;
      for (let i = 1; i < coords.length; i++) {
        const prev = L.latLng(coords[i - 1]);
        const curr = L.latLng(coords[i]);
        const segDist = prev.distanceTo(curr) / 1000;
        if (totalDist + segDist >= targetKm) {
          const ratio = (targetKm - totalDist) / segDist;
          const lat = prev.lat + (curr.lat - prev.lat) * ratio;
          const lng = prev.lng + (curr.lng - prev.lng) * ratio;
          return [lat, lng];
        }
        totalDist += segDist;
      }
      return coords[coords.length - 1];
    }

    aidStations.forEach(station => {
      const latlng = getLatLngAtKm(station.km);
      L.marker(latlng).addTo(map)
        .bindPopup(`<strong>${station.name}</strong><br>km ${station.km}<br>Cutoff: ${station.cutoff || '—'}<br>Planned rest: ${station.rest} h`);
    });

    // Elevation chart (optional)
    if (typeof echarts !== 'undefined') {
      const elevation = track.geometry.coordinates.map(c => c[2] || 0);
      const distance = track.geometry.coordinates.map((_, i) => i);

      const chart = echarts.init(document.getElementById('chart'));
      chart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: distance, name: 'Point Index' },
        yAxis: { type: 'value', name: 'Elevation (m)' },
        series: [{
          data: elevation,
          type: 'line',
          areaStyle: {}
        }]
      });
    }

    // Planner
    const goalInput = document.getElementById('goal-time');
    const plannerDiv = document.getElementById('planner-output');
    goalInput.addEventListener('input', updatePlanner);
    updatePlanner();

    function updatePlanner() {
      const goal = parseFloat(goalInput.value);
      if (isNaN(goal)) return;

      const totalRest = aidStations.reduce((sum, a) => sum + (a.rest || 0), 0);
      const movingTime = goal - totalRest;
      const output = [];

      for (let i = 1; i < aidStations.length; i++) {
        const prev = aidStations[i - 1];
        const curr = aidStations[i];
        const sectionKm = curr.km - prev.km;
        const sectionTime = (sectionKm / 326) * movingTime;
        output.push(`<b>${prev.name} → ${curr.name}</b>: ${sectionKm} km, ${sectionTime.toFixed(1)} h + ${curr.rest} h rest`);
      }

      plannerDiv.innerHTML = `<p><b>Goal:</b> ${goal} h | <b>Moving:</b> ${movingTime.toFixed(1)} h | <b>Rest:</b> ${totalRest} h</p>` +
                             output.map(x => `<p>${x}</p>`).join('');
    }

  } catch (err) {
    console.error("Error loading GPX:", err);
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => {
      console.log("✅ Service Worker registered");
    });
  }
});
