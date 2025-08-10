let parsedGpxData = null;

const cutOffs = [
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

function calculateEstimatedTimeAtDistance(targetDistance, goalTimeMinutes, backpackWeight) {
  if (!parsedGpxData) return 0;

  const coords = parsedGpxData.features[0].geometry.coordinates;
  const totalDistance = parsedGpxData.totalDistance;
  const basePace = goalTimeMinutes / totalDistance;

  let distanceCovered = 0;
  let estimatedTime = 0;

  for (let i = 1; i < coords.length; i++) {
    const segmentStart = coords[i-1];
    const segmentEnd = coords[i];
    const segmentDistance = calculateDistance(segmentStart[1], segmentStart[0], segmentEnd[1], segmentEnd[0]);

    if (distanceCovered + segmentDistance >= targetDistance) {
      const remainingDistance = targetDistance - distanceCovered;
      const elevationChange = segmentEnd[2] - segmentStart[2];
      const gradient = (elevationChange / (segmentDistance * 1000)) * 100;
      let adjustedPace = basePace;
      if (gradient > 0) adjustedPace *= (1 + (gradient * 0.025));
      else adjustedPace *= (1 + (gradient * 0.015));
      const finalPace = adjustedPace * (1 + (backpackWeight * 0.01));
      estimatedTime += finalPace * remainingDistance;
      break;
    }

    distanceCovered += segmentDistance;

    const elevationChange = segmentEnd[2] - segmentStart[2];
    const gradient = (elevationChange / (segmentDistance * 1000)) * 100;
    let adjustedPace = basePace;
    if (gradient > 0) adjustedPace *= (1 + (gradient * 0.025));
    else adjustedPace *= (1 + (gradient * 0.015));
    const finalPace = adjustedPace * (1 + (backpackWeight * 0.01));
    estimatedTime += finalPace * segmentDistance;
  }

  return estimatedTime;
}

function generatePacingPlan() {
  if (!parsedGpxData) {
    alert("GPX data not loaded yet. Please wait or refresh the page.");
    return;
  }

  const goalTimeInput = document.getElementById('goalTime').value;
  const backpackWeight = parseFloat(document.getElementById('backpackWeight').value);

  if (!goalTimeInput) {
    alert("Please enter a goal finish time.");
    return;
  }

  const goalTimeMinutes = timeStrToMinutes(goalTimeInput);
  const finishCutOff = cutOffs[cutOffs.length - 1];

  if (goalTimeMinutes >= finishCutOff.time) {
    alert(`Your goal time of ${minutesToTimeStr(goalTimeMinutes)} exceeds the final cut-off time of ${minutesToTimeStr(finishCutOff.time)}.`);
    return;
  }

  for (const cutOff of cutOffs) {
    if (cutOff.name === 'Finish') continue;

    const estimatedTime = calculateEstimatedTimeAtDistance(cutOff.distance, goalTimeMinutes, backpackWeight);
    const requiredTime = cutOff.time - bufferMinutes;

    if (estimatedTime >= requiredTime) {
      alert(
        `Validation failed at ${cutOff.name}.\n` +
        `Estimated arrival: ${minutesToTimeStr(estimatedTime)}\n` +
        `Required arrival (with 3h buffer): ${minutesToTimeStr(requiredTime)}\n` +
        `Cut-off time: ${minutesToTimeStr(cutOff.time)}\n\n` +
        `Please adjust your goal time to be faster.`
      );
      return;
    }
  }
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
  const remainingCutOffs = [...cutOffs].sort((a, b) => a.distance - b.distance);

  segments.forEach(segment => {
    const segmentEndDistance = cumulativeDistance + segment.distance;

    while (remainingCutOffs.length > 0 && remainingCutOffs[0].distance <= segmentEndDistance) {
      const cutOff = remainingCutOffs.shift();
      const estimatedTimeAtCutOff = calculateEstimatedTimeAtDistance(cutOff.distance, goalTimeMinutes, backpackWeight);

      const cutOffRow = document.createElement("tr");
      cutOffRow.className = 'cut-off-row';
      cutOffRow.innerHTML = `
        <td colspan="7" style="text-align: center;">
          <strong>${cutOff.name} @ ${cutOff.distance.toFixed(2)} km</strong> |
          Arrival: ${minutesToTimeStr(estimatedTimeAtCutOff)} |
          Cut-off: ${minutesToTimeStr(cutOff.time)}
        </td>
      `;
      tableBody.appendChild(cutOffRow);
    }

    cumulativeDistance = segmentEndDistance;
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
