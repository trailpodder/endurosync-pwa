// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(() => {
    console.log('✅ Service Worker registered');
  });
}

// Load and parse GPX
fetch('route.gpx')
  .then(res => res.text())
  .then(gpxText => {
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxText, 'application/xml');
    const geojson = toGeoJSON.gpx(gpxDoc);
    const track = geojson.features.find(f => f.geometry.type === 'LineString');
    const coords = track.geometry.coordinates.map(c => [c[1], c[0]]);
    const elevations = track.geometry.coordinates.map(c => c[2] || 0);

    const map = L.map('map').setView(coords[0], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    L.polyline(coords, { color: 'blue' }).addTo(map);

    // Elevation chart
    const distance = (i) => {
      let d = 0;
      for (let j = 1; j <= i; j++) {
        const dx = coords[j][1] - coords[j - 1][1];
        const dy = coords[j][0] - coords[j - 1][0];
        d += Math.sqrt(dx * dx + dy * dy) * 111.32; // rough km distance
      }
      return d;
    };
    const distArray = elevations.map((_, i) => distance(i).toFixed(1));

    const chart = echarts.init(document.getElementById('elevation'));
    chart.setOption({
      xAxis: { type: 'category', data: distArray, name: 'km' },
      yAxis: { type: 'value', name: 'Elevation (m)' },
      series: [{
        type: 'line',
        data: elevations,
        areaStyle: {}
      }],
      tooltip: {
        trigger: 'axis',
        formatter: (params) => `km ${params[0].axisValue}<br>Elev: ${params[0].data} m`
      }
    });

    // Aid station planner
    window.updatePlanner = function () {
      const goalTime = parseFloat(document.getElementById('goalTime').value);
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

      const tbody = document.querySelector('#plannerTable tbody');
      tbody.innerHTML = '';

      const totalDistance = aidStations[aidStations.length - 1].km;
      const pace = (goalTime - aidStations.reduce((a, s) => a + (s.rest || 0), 0)) / totalDistance;

      let timeElapsed = 0;

      for (let i = 0; i < aidStations.length - 1; i++) {
        const from = aidStations[i];
        const to = aidStations[i + 1];
        const dist = to.km - from.km;
        const travel = dist * pace;
        const arrival = timeElapsed + travel;
        const departure = arrival + (to.rest || 0);

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${from.name}</td>
          <td>${to.name}</td>
          <td>${dist.toFixed(1)}</td>
          <td>${travel.toFixed(1)} h</td>
          <td>${formatTime(arrival)}</td>
          <td>${to.rest ? to.rest + ' h' : ''}</td>
          <td>${formatTime(departure)}</td>
          <td>${to.cutoff || ''}</td>
        `;
        tbody.appendChild(row);
        timeElapsed = departure;
      }

      // Add aid station markers
      aidStations.forEach(station => {
        const latlng = getLatLngAtKm(station.km, coords);
        L.marker(latlng).addTo(map).bindPopup(`${station.name}<br>${station.km} km`);
      });
    };

    // Helper functions
    function formatTime(hours) {
      const start = new Date('2025-09-01T12:00:00'); // Monday 12:00
      const time = new Date(start.getTime() + hours * 3600000);
      return time.toUTCString().slice(0, 22).replace('GMT', '');
    }

    function getLatLngAtKm(targetKm, coords) {
      let dist = 0;
      for (let i = 1; i < coords.length; i++) {
        const dx = coords[i][1] - coords[i - 1][1];
        const dy = coords[i][0] - coords[i - 1][0];
        const segment = Math.sqrt(dx * dx + dy * dy) * 111.32;
        if (dist + segment >= targetKm) {
          const ratio = (targetKm - dist) / segment;
          const lat = coords[i - 1][0] + ratio * (coords[i][0] - coords[i - 1][0]);
          const lng = coords[i - 1][1] + ratio * (coords[i][1] - coords[i - 1][1]);
          return [lat, lng];
        }
        dist += segment;
      }
      return coords[coords.length - 1];
    }

    // Trigger initial planner update
    updatePlanner();
  })
  .catch(err => console.error('Error loading GPX:', err));
