let map;
let gpxUrl = 'nuts300.gpx';

const aidStations = [
  { name: 'Start (Njurgulahti)', km: 0, cutoff: 'Mon 12:00', lat: 68.47115, lon: 24.84449 },
  { name: 'Kalmankaltio', km: 88, cutoff: 'Tue 12:00', lat: 68.38303, lon: 23.66539 },
  { name: 'Hetta', km: 192, cutoff: 'Thu 13:00', lat: 68.38372, lon: 23.62737 },
  { name: 'Pallas', km: 256, cutoff: 'Fri 13:00', lat: 68.36449, lon: 24.03721 },
  { name: 'Rauhala (water)', km: 277, lat: 68.32420, lon: 24.26421 },
  { name: 'Pahtavuoma (water)', km: 288, lat: 68.28021, lon: 24.38163 },
  { name: 'Peurakaltio (water)', km: 301, lat: 68.21952, lon: 24.55385 },
  { name: 'Finish (Äkäslompolo)', km: 326, cutoff: 'Sat 18:00', lat: 67.61469, lon: 24.14971 }
];

const tableStations = [
  { name: 'Start (Njurgulahti)', km: 0, etaIn: '-', etaOut: 'Mon 12:00', rest: '-' },
  { name: 'Kalmankaltio', km: 88, etaIn: 'Tue 06:00', etaOut: 'Tue 07:00', rest: '01:00' },
  { name: 'Hetta', km: 192, etaIn: 'Wed 13:00', etaOut: 'Wed 15:00', rest: '02:00' },
  { name: 'Pallas', km: 256, etaIn: 'Thu 10:00', etaOut: 'Thu 13:00', rest: '03:00' },
  { name: 'Finish (Äkäslompolo)', km: 326, etaIn: 'Fri 11:00', etaOut: '-', rest: '-' }
];

function parseTimeStr(str) {
  if (str === '-') return null;
  const [day, time] = str.split(' ');
  const dayOffsets = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5 };
  const [h, m] = time.split(':').map(Number);
  return (dayOffsets[day] * 24 + h) * 60 + m;
}

function parseHM(str) {
  if (str === '-' || !str.includes(':')) return 0;
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

function minsToDayTime(mins) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = dayNames[Math.floor(mins / 1440)];
  const hh = String(Math.floor((mins % 1440) / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  return `${day} ${hh}:${mm}`;
}

function minsToHM(mins) {
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function updateTable() {
  const tbody = document.querySelector('#plannerTable tbody');
  tbody.innerHTML = '';

  let elapsed = 0;
  let goalMins = 0;

  for (let i = 0; i < tableStations.length; i++) {
    const row = document.createElement('tr');
    const station = tableStations[i];

    const dist = station.km;
    const nextDist = i < tableStations.length - 1 ? tableStations[i + 1].km : dist;
    const sectionDist = nextDist - dist;

    const etaInStr = station.etaIn;
    const etaOutStr = station.etaOut;
    const etaInMins = parseTimeStr(etaInStr);
    const etaOutMins = parseTimeStr(etaOutStr);
    const restMins = parseHM(station.rest);

    let sectionTime = 0;
    if (i > 0 && etaInMins !== null && parseTimeStr(tableStations[i - 1].etaOut) !== null) {
      sectionTime = etaInMins - parseTimeStr(tableStations[i - 1].etaOut);
    }

    if (etaOutMins !== null && parseTimeStr(tableStations[0].etaOut) !== null) {
      elapsed = etaOutMins - parseTimeStr(tableStations[0].etaOut);
    }

    if (i === tableStations.length - 1 && etaInMins !== null) {
      goalMins = etaInMins - parseTimeStr(tableStations[0].etaOut);
    }

    const pace = sectionTime && sectionDist ? (sectionDist / (sectionTime / 60)).toFixed(2) : '-';

    const cells = [
      station.name,
      sectionDist || '-',
      etaInStr,
      etaOutStr,
      station.rest,
      i === 0 ? '-' : minsToHM(sectionTime),
      minsToHM(elapsed),
      pace === '-' ? '-' : `${pace} km/h`,
      aidStations.find(a => a.name.includes(station.name.split(' ')[0]))?.cutoff || '-'
    ];

    cells.forEach((c, ci) => {
      const cell = document.createElement('td');
      if (ci === 2 || ci === 3) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = c;
        input.size = 9;
        input.addEventListener('change', () => {
          if (ci === 2) station.etaIn = input.value;
          if (ci === 3) station.etaOut = input.value;
          updateTable();
        });
        cell.appendChild(input);
      } else if (ci === 4) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = c;
        input.size = 5;
        input.addEventListener('change', () => {
          station.rest = input.value;
          updateTable();
        });
        cell.appendChild(input);
      } else {
        cell.textContent = c;
      }
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  }

  document.getElementById('goalOutput').textContent =
    `Goal finish time: ${minsToHM(goalMins)} h ${tableStations.at(-1).etaIn}`;
}

async function initMap() {
  map = L.map('map').setView([68.4, 24.0], 8);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  const gpxRes = await fetch(gpxUrl);
  const gpxText = await gpxRes.text();
  const parser = new DOMParser();
  const gpxDoc = parser.parseFromString(gpxText, 'application/xml');
  const geojson = toGeoJSON.gpx(gpxDoc);

  const gpxLayer = L.geoJSON(geojson, {
    style: { color: 'blue', weight: 3 }
  }).addTo(map);
  map.fitBounds(gpxLayer.getBounds());

  aidStations.forEach(station => {
    L.marker([station.lat, station.lon])
      .addTo(map)
      .bindPopup(station.name + (station.cutoff ? `<br>Cutoff: ${station.cutoff}` : ''));
  });

  updateTable();
}

document.getElementById('calculateBtn').addEventListener('click', updateTable);

initMap();
