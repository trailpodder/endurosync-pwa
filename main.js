// main.js

import { gpx } from './togeojson.js';

const map = L.map('map').setView([68.5, 21], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
}).addTo(map);

const elevationChart = echarts.init(document.getElementById('elevation-chart'));

const aidStations = [
  { name: 'Start: Njurkulahti', km: 0, cutoff: '2025-08-25T12:00:00', rest: 0 },
  { name: 'Kalmankaltio', km: 88, cutoff: '2025-08-26T12:00:00', rest: 1 },
  { name: 'Hetta', km: 157, cutoff: '2025-08-27T18:00:00', rest: 2 },
  { name: 'Pallas', km: 233, cutoff: '2025-08-28T12:00:00', rest: 3 },
  { name: 'Finish: Ylläs', km: 326, cutoff: '2025-08-29T06:00:00', rest: 0 }
];

const goalTimeInput = document.getElementById('goal-time');
const restInputs = document.querySelectorAll('.rest-time');
const planTable = document.getElementById('plan-table');
const recalcBtn = document.getElementById('recalc-btn');

function parseTime(str) {
  return new Date(str).getTime();
}

function formatTime(h) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${mins}min`;
}

function recalculatePlan() {
  const goalHours = parseFloat(goalTimeInput.value);
  const restTimes = Array.from(restInputs).map(input => parseFloat(input.value));
  aidStations.forEach((s, i) => s.rest = restTimes[i]);

  const cutoffTimes = aidStations.map(s => parseTime(s.cutoff));
  const arrivalTimes = [parseTime(aidStations[0].cutoff)];
  const sectionTimes = [];
  const paces = [];

  for (let i = 1; i < aidStations.length; i++) {
    const dist = aidStations[i].km - aidStations[i - 1].km;
    const cutoff = cutoffTimes[i];
    const latestArrival = cutoff - (aidStations[i].rest + 1) * 3600000; // ms
    const sectionTimeMs = latestArrival - arrivalTimes[i - 1];
    const sectionTimeHr = sectionTimeMs / 3600000;
    const pace = dist / sectionTimeHr;

    paces.push(pace);
    sectionTimes.push(sectionTimeHr);
    arrivalTimes.push(arrivalTimes[i - 1] + sectionTimeMs);
  }

  const totalTime = sectionTimes.reduce((a, b) => a + b, 0);
  const totalKm = aidStations[aidStations.length - 1].km;

  planTable.innerHTML = `
    <tr><th>From → To</th><th>Distance (km)</th><th>Time</th><th>Pace (km/h)</th><th>Rest (h)</th><th>Strategy</th></tr>
    ${aidStations.slice(1).map((s, i) => {
      const from = aidStations[i].name.split(': ')[1] || aidStations[i].name;
      const to = s.name.split(': ')[1] || s.name;
      return `<tr>
        <td>${from} → ${to}</td>
        <td>${(s.km - aidStations[i].km).toFixed(1)}</td>
        <td>${formatTime(sectionTimes[i])}</td>
        <td>${paces[i].toFixed(2)}</td>
        <td>${s.rest}</td>
        <td><input type="text" placeholder="Strategy notes"></td>
      </tr>`;
    }).join('')}
    <tr><th>Total</th><th>${totalKm}</th><th>${formatTime(totalTime)}</th><th colspan="3"></th></tr>
  `;
}

recalcBtn.addEventListener('click', recalculatePlan);

fetch('nuts300.gpx')
  .then(res => res.text())
  .then(str => (new window.DOMParser()).parseFromString(str, 'text/xml'))
  .then(gpxDoc => {
    const geojson = gpx(gpxDoc);
    const track = L.geoJSON(geojson, { style: { color: 'blue' } }).addTo(map);
    map.fitBounds(track.getBounds());

    const coords = geojson.features[0].geometry.coordinates;
    const elevData = coords.map((c, i) => [i, c[2]]);
    elevationChart.setOption({
      xAxis: { type: 'value', name: 'Point' },
      yAxis: { type: 'value', name: 'Elevation (m)' },
      series: [{ data: elevData, type: 'line', areaStyle: {} }]
    });

    aidStations.forEach(st => {
      const nearest = coords.reduce((a, b) => (Math.abs(b[0] - st.lon || 0) + Math.abs(b[1] - st.lat || 0) < Math.abs(a[0] - st.lon || 0) + Math.abs(a[1] - st.lat || 0)) ? b : a);
      L.marker([nearest[1], nearest[0]]).addTo(map).bindPopup(st.name);
    });
  })
  .catch(err => console.error('Error loading GPX:', err));

recalculatePlan();
