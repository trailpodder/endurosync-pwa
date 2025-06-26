// main.js

import { gpx } from './togeojson.js';

const aidStations = [
  { name: "Start: Njurgulahti", km: 0, cutoff: 0 },
  { name: "Kalmankaltio", km: 88, cutoff: 24 },
  { name: "Hetta", km: 192, cutoff: 73 },
  { name: "Pallas", km: 256, cutoff: 97 },
  { name: "Rauhala (water only)", km: 277 },
  { name: "Pahtavuoma (water only)", km: 288 },
  { name: "Peurakaltio (water only)", km: 301 },
  { name: "Finish: Äkäslompolo", km: 326, cutoff: 126 }
];

const restTimes = [0, 1, 2, 3, 0, 0, 0, 0];

const map = L.map('map').setView([68.5, 21], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const elevationChart = echarts.init(document.getElementById('elevation'));

fetch('nuts300.gpx')
  .then(response => response.text())
  .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
  .then(data => {
    const geojson = gpx(data);
    const coords = geojson.features[0].geometry.coordinates;

    const latlngs = coords.map(c => [c[1], c[0]]);
    const elevation = coords.map((c, i) => ({
      value: c[2] || 0,
      distance: i > 0 ? (i * 326 / coords.length).toFixed(1) : 0
    }));

    const polyline = L.polyline(latlngs, { color: 'blue' }).addTo(map);
    map.fitBounds(polyline.getBounds());

    aidStations.forEach((station, i) => {
      const index = Math.floor((station.km / 326) * coords.length);
      const [lon, lat] = coords[index];
      L.marker([lat, lon], {
        icon: L.icon({
          iconUrl: 'favicon.ico',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })
      }).addTo(map).bindPopup(station.name);
    });

    elevationChart.setOption({
      xAxis: {
        type: 'category',
        data: elevation.map(e => e.distance + ' km')
      },
      yAxis: {
        type: 'value',
        name: 'Elevation (m)'
      },
      series: [{
        type: 'line',
        data: elevation.map(e => e.value),
        areaStyle: {}
      }]
    });

    const planBody = document.getElementById('planBody');
    const planFooter = document.getElementById('planFooter');

    function recalculatePlan() {
      const goalTime = parseFloat(document.getElementById('goalTime').value);
      const totalDistance = aidStations[aidStations.length - 1].km;

      const segmentCount = aidStations.length - 1;
      let remainingTime = goalTime;
      const buffer = 1; // 1h buffer per section

      let plan = [];
      let totalTime = 0;

      for (let i = 0; i < segmentCount; i++) {
        const from = aidStations[i];
        const to = aidStations[i + 1];
        const segmentDistance = to.km - from.km;
        const cutoffH = to.cutoff !== undefined ? to.cutoff : goalTime;
        const maxTime = cutoffH - totalTime - restTimes[i + 1] - buffer;
        const pace = segmentDistance / maxTime;
        const time = segmentDistance / pace;

        totalTime += time + restTimes[i + 1];

        plan.push({
          section: `${from.name} → ${to.name}`,
          distance: segmentDistance.toFixed(1),
          time: time.toFixed(1),
          pace: pace.toFixed(2),
          rest: restTimes[i + 1],
          cutoff: to.cutoff !== undefined ? `${to.cutoff} h` : '-'
        });
      }

      planBody.innerHTML = '';
      plan.forEach((row, i) => {
        planBody.innerHTML += `
          <tr>
            <td>${row.section}</td>
            <td>${row.distance}</td>
            <td>${row.time}</td>
            <td>${row.pace}</td>
            <td><input type="number" value="${row.rest}" data-index="${i}" class="rest-input" /></td>
            <td>${row.cutoff}</td>
          </tr>
        `;
      });

      const totalDistanceSum = plan.reduce((sum, r) => sum + parseFloat(r.distance), 0);
      const totalTimeSum = plan.reduce((sum, r) => sum + parseFloat(r.time) + parseFloat(r.rest), 0);

      planFooter.innerHTML = `
        <td><strong>Total</strong></td>
        <td><strong>${totalDistanceSum.toFixed(1)}</strong></td>
        <td><strong>${totalTimeSum.toFixed(1)}</strong></td>
        <td colspan="3"></td>
      `;
    }

    recalculatePlan();

    document.getElementById('recalculate').addEventListener('click', () => {
      const inputs = document.querySelectorAll('.rest-input');
      inputs.forEach(input => {
        const i = parseInt(input.dataset.index);
        restTimes[i + 1] = parseFloat(input.value);
      });
      recalculatePlan();
    });
  })
  .catch(err => console.error("Error loading GPX:", err));

navigator.serviceWorker?.register("sw.js").then(() => console.log("✅ Service Worker registered"));
