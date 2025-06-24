// Wait until the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('map').setView([68.3, 23.5], 8);

  // Load tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
  }).addTo(map);

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

  // Setup goal time input
  const goalInput = document.getElementById('goalTime');
  const restInputsContainer = document.getElementById('restInputs');
  const planOutput = document.getElementById('pacePlan');

  // Build rest time inputs
  aidStations.forEach((station, idx) => {
    const div = document.createElement('div');
    div.innerHTML = `
      <label>${station.name} rest (h):</label>
      <input type="number" step="0.25" min="0" value="${station.rest}" data-idx="${idx}" />
    `;
    restInputsContainer.appendChild(div);
  });

  // Load GPX and render everything
  fetch('nuts300.gpx')
    .then(res => res.text())
    .then(gpxText => {
      const parser = new DOMParser();
      const gpxDoc = parser.parseFromString(gpxText, 'application/xml');
      const geojson = toGeoJSON.gpx(gpxDoc);
      const coordinates = geojson.features[0].geometry.coordinates;

      // Draw GPX track
      const latlngs = coordinates.map(c => [c[1], c[0]]);
      const polyline = L.polyline(latlngs, { color: 'blue' }).addTo(map);
      map.fitBounds(polyline.getBounds());

      // Compute cumulative distance for each point
      const cumDist = [0];
      for (let i = 1; i < latlngs.length; i++) {
        const prev = L.latLng(latlngs[i - 1]);
        const curr = L.latLng(latlngs[i]);
        cumDist.push(cumDist[i - 1] + prev.distanceTo(curr) / 1000);
      }

      function getLatLngAtKm(targetKm) {
        for (let i = 1; i < cumDist.length; i++) {
          if (cumDist[i] >= targetKm) {
            return latlngs[i];
          }
        }
        return latlngs[latlngs.length - 1];
      }

      // Place aid station markers
      aidStations.forEach(station => {
        const latlng = getLatLngAtKm(station.km);
        if (latlng) {
          L.marker(latlng).addTo(map).bindPopup(`${station.name} (${station.km} km)`);
        }
      });

      // Elevation chart
      const elevationData = coordinates.map((c, i) => ({
        distance: cumDist[i].toFixed(1),
        elevation: c[2] || 0
      }));

      const chart = echarts.init(document.getElementById('chart'));
      chart.setOption({
        tooltip: {
          trigger: 'axis'
        },
        xAxis: {
          type: 'category',
          data: elevationData.map(p => p.distance),
          name: 'Distance (km)'
        },
        yAxis: {
          type: 'value',
          name: 'Elevation (m)'
        },
        series: [{
          type: 'line',
          data: elevationData.map(p => p.elevation),
          areaStyle: {},
          name: 'Elevation'
        }]
      });

      // Calculate pace plan
      function updatePacePlan() {
        const goalTime = parseFloat(goalInput.value);
        const restTimes = Array.from(restInputsContainer.querySelectorAll('input'))
          .map(input => parseFloat(input.value) || 0);

        const totalRest = restTimes.reduce((a, b) => a + b, 0);
        const movingTime = goalTime - totalRest;

        if (movingTime <= 0) {
          planOutput.innerHTML = "<p style='color:red'>Goal time must exceed total rest time.</p>";
          return;
        }

        let outputHtml = `<p>Total rest time: ${totalRest.toFixed(1)} h<br>Planned moving time: ${movingTime.toFixed(1)} h</p>`;
        outputHtml += `<table><tr><th>From</th><th>To</th><th>Distance (km)</th><th>ETA</th><th>Rest (h)</th></tr>`;

        let elapsed = 0;
        for (let i = 0; i < aidStations.length - 1; i++) {
          const from = aidStations[i];
          const to = aidStations[i + 1];
          const segmentDist = to.km - from.km;
          const segmentTime = segmentDist / (326 / movingTime); // uniform average pace
          elapsed += segmentTime;

          const eta = new Date(Date.parse("2025-09-01T12:00:00Z") + elapsed * 3600000); // race starts Mon 12:00 UTC
          const etaStr = eta.toUTCString().replace(' GMT', '');

          outputHtml += `<tr>
            <td>${from.name}</td>
            <td>${to.name}</td>
            <td>${segmentDist}</td>
            <td>${etaStr}</td>
            <td>${restTimes[i + 1]}</td>
          </tr>`;

          elapsed += restTimes[i + 1];
        }

        outputHtml += `</table>`;
        planOutput.innerHTML = outputHtml;
      }

      goalInput.addEventListener('input', updatePacePlan);
      restInputsContainer.addEventListener('input', updatePacePlan);

      updatePacePlan();
    })
    .catch(err => {
      console.error("Error loading GPX:", err);
    });

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => {
      console.log("✅ Service Worker registered");
    });
  }
});
