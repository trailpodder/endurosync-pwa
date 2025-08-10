let parsedGpxData = null;

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
  if (!parsedGpxData) {
    alert("Please upload a GPX file first.");
    return;
  }

  const goalTimeInput = document.getElementById('goalTime').value;
  const backpackWeight = parseFloat(document.getElementById('backpackWeight').value);

  if (!goalTimeInput) {
    alert("Please enter a goal finish time.");
    return;
  }

  const goalTimeMinutes = timeStrToMinutes(goalTimeInput);
  const coords = parsedGpxData.features[0].geometry.coordinates;
  const totalDistance = parsedGpxData.totalDistance;

  // Base pace in minutes per km
  const basePace = goalTimeMinutes / totalDistance;

  const segments = [];
  const segmentLength = 10; // 10 km segments
  let distanceCovered = 0;
  let segmentPoints = [coords[0]];

  for (let i = 1; i < coords.length; i++) {
    const dist = calculateDistance(coords[i-1][1], coords[i-1][0], coords[i][1], coords[i][0]);
    distanceCovered += dist;
    segmentPoints.push(coords[i]);

    if (distanceCovered >= segmentLength || i === coords.length - 1) {
      const segmentDistance = distanceCovered;
      const startEle = segmentPoints[0][2];
      const endEle = segmentPoints[segmentPoints.length - 1][2];
      const elevationChange = endEle - startEle;
      const gradient = (elevationChange / (segmentDistance * 1000)) * 100; // in percent

      let adjustedPace = basePace;
      if (gradient > 0) {
        adjustedPace *= (1 + (gradient * 0.025)); // 2.5% slower per 1% incline
      } else {
        adjustedPace *= (1 + (gradient * 0.015)); // 1.5% faster per 1% decline (gradient is negative)
      }

      const finalPace = adjustedPace * (1 + (backpackWeight * 0.01)); // 1% slower per kg
      const segmentTime = finalPace * segmentDistance;

      segments.push({
        distance: segmentDistance,
        pace: finalPace,
        time: segmentTime,
        elevationChange: elevationChange,
        gradient: gradient
      });

      distanceCovered = 0;
      segmentPoints = [coords[i]];
    }
  }

  const tableBody = document.querySelector("#newPacingTable tbody");
  tableBody.innerHTML = ""; // Clear existing rows

  let cumulativeDistance = 0;
  let cumulativeTime = 0;
  segments.forEach(segment => {
    cumulativeDistance += segment.distance;
    cumulativeTime += segment.time;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${cumulativeDistance.toFixed(2)}</td>
      <td>${segment.distance.toFixed(2)}</td>
      <td>${segment.pace.toFixed(2)}</td>
      <td>${minutesToTimeStr(segment.time)}</td>
      <td>${minutesToTimeStr(cumulativeTime)}</td>
      <td>${segment.elevationChange.toFixed(2)}</td>
      <td>${segment.gradient.toFixed(2)}</td>
    `;
    tableBody.appendChild(row);
  });
}

function initialize() {
  const gpxFileInput = document.getElementById('gpxFile');
  gpxFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const gpxText = e.target.result;
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
    };
    reader.readAsText(file);
  });

  document.getElementById('generatePlanBtn').addEventListener('click', generatePacingPlan);
}

document.addEventListener("DOMContentLoaded", initialize);
