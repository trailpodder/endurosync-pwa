let parsedGpxData = null;

const cutOffs = [
  { name: 'Start', distance: 0, time: 0 },
  { name: 'Kalmakaltio', distance: 88, time: 24 * 60 }, // 24:00h in minutes
  { name: 'Hetta', distance: 206, time: 73 * 60 }, // 73:00h in minutes
  { name: 'Pallas', distance: 261, time: 97 * 60 }, // 97:00h in minutes
  { name: 'Finish', distance: 326, time: 126 * 60 } // 126:00h in minutes
];
const bufferMinutes = 3 * 60; // 3 hours in minutes

function timeStrToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTimeStr(mins) {
  const totalMinutes = Math.round(mins);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function calculateElevationGain(coords) {
  let elevationGain = 0;
  for (let i = 1; i < coords.length; i++) {
    const elevationDiff = coords[i][2] - coords[i - 1][2];
    if (elevationDiff > 0) {
      elevationGain += elevationDiff;
    }
  }
  return elevationGain;
}

function generatePacingPlan() {
    // 1. Get and validate inputs
    if (!parsedGpxData) {
        alert("GPX data not loaded yet. Please wait or refresh the page.");
        return;
    }
    const goalTimeInput = document.getElementById('goalTime').value;
    if (!goalTimeInput) {
        alert("Please enter a goal finish time.");
        return;
    }
    const goalTimeMinutes = timeStrToMinutes(goalTimeInput);
    const finalCutOff = cutOffs[cutOffs.length - 1];
    if (goalTimeMinutes >= finalCutOff.time) {
        alert(`Your goal time of ${minutesToTimeStr(goalTimeMinutes)} exceeds the final closing time of ${minutesToTimeStr(finalCutOff.time)}.`);
        return;
    }

    // 2. Clear table and initialize variables
    const tableBody = document.querySelector("#newPacingTable tbody");
    tableBody.innerHTML = "";
    let cumulativeArrivalTime = 0;

    // 3. Loop through each major race section
    for (let i = 0; i < cutOffs.length - 1; i++) {
        const sectionStart = cutOffs[i];
        const sectionEnd = cutOffs[i+1];

        const isFinishSection = (sectionEnd.name === 'Finish');

        // Determine the planned arrival time for the end of this section
        const plannedArrivalTime = isFinishSection ? goalTimeMinutes : sectionEnd.time - bufferMinutes;

        // Calculate section-specific metrics
        const sectionDistance = sectionEnd.distance - sectionStart.distance;
        const sectionTime = plannedArrivalTime - cumulativeArrivalTime;

        if (sectionTime <= 0) {
            alert(`Impossible plan. The time budget for the section "${sectionStart.name} to ${sectionEnd.name}" is zero or negative. Try a faster goal time.`);
            tableBody.innerHTML = ""; // Clear partial plan
            return;
        }

        const avgPace = sectionTime / sectionDistance;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${sectionStart.name} to ${sectionEnd.name}</td>
            <td>${sectionDistance.toFixed(2)}</td>
            <td>${minutesToTimeStr(sectionTime)}</td>
            <td>${avgPace.toFixed(2)}</td>
            <td>${minutesToTimeStr(plannedArrivalTime)}</td>
            <td>${minutesToTimeStr(sectionEnd.time)}</td>
        `;
        tableBody.appendChild(row);

        // Update cumulative time for the next iteration
        cumulativeArrivalTime = plannedArrivalTime;
    }
}

function processGpx(gpxText) {
    const gpx = new DOMParser().parseFromString(gpxText, 'text/xml');
    const geojson = toGeoJSON.gpx(gpx);

    const coords = geojson.features[0].geometry.coordinates;
    let totalDistance = 0;
    for (let i = 1; i < coords.length; i++) {
        totalDistance += calculateDistance(coords[i-1][1], coords[i-1][0], coords[i][1], coords[i][0]);
    }

    geojson.totalDistance = totalDistance;
    parsedGpxData = geojson;

    const totalElevationGain = calculateElevationGain(coords);

    const courseInfoDiv = document.getElementById('courseInfo');
    courseInfoDiv.innerHTML = `
      <h3>Course Information</h3>
      <p>Total Distance: ${totalDistance.toFixed(2)} km</p>
      <p>Total Elevation Gain: ${totalElevationGain.toFixed(2)} m</p>
    `;
}

function initialize() {
  fetch('nuts300.gpx')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.text();
    })
    .then(gpxText => {
      processGpx(gpxText);
    })
    .catch(error => {
      console.error('Error loading or processing default GPX file:', error);
      document.getElementById('courseInfo').innerHTML = `<p style="color: red;">Error loading default GPX data. Please try refreshing the page.</p>`;
    });

  document.getElementById('generatePlanBtn').addEventListener('click', generatePacingPlan);
}

document.addEventListener("DOMContentLoaded", initialize);
