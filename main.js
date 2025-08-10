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
    const backpackWeight = parseFloat(document.getElementById('backpackWeight').value);
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

    // 2. Prepare race plan with user's goal time
    const racePlan = JSON.parse(JSON.stringify(cutOffs));
    racePlan[racePlan.length - 1].time = goalTimeMinutes;

    // 3. Initialize variables
    const tableBody = document.querySelector("#newPacingTable tbody");
    tableBody.innerHTML = ""; // Clear existing rows
    const coords = parsedGpxData.features[0].geometry.coordinates;
    const segmentLength = 10; // 10 km segments

    let gpxCoordIndex = 1;
    let cumulativeDistance = 0;
    let cumulativeTime = 0;

    // 4. Loop through each major race section (between cut-offs)
    for (let i = 0; i < racePlan.length - 1; i++) {
        const sectionStart = racePlan[i];
        const sectionEnd = racePlan[i+1];

        // Determine the time budget for this section
        const isFinishSection = (sectionEnd.name === 'Finish');
        const sectionTimeBudget = (sectionEnd.time - sectionStart.time) - (isFinishSection ? 0 : bufferMinutes);
        const sectionDistance = sectionEnd.distance - sectionStart.distance;

        if (sectionTimeBudget <= 0) {
            alert(`Impossible plan. The time budget for the section "${sectionStart.name} to ${sectionEnd.name}" is zero or negative. Please check cut-off times.`);
            return;
        }

        const sectionBasePace = sectionTimeBudget / sectionDistance;
        let distanceWithinSection = 0;

        // 5. Loop through GPX coordinates to create 10km segments for this major section
        let segmentPoints = [coords[gpxCoordIndex - 1]];
        let distanceCoveredInSegment = 0;

        while (gpxCoordIndex < coords.length) {
            const dist = calculateDistance(coords[gpxCoordIndex - 1][1], coords[gpxCoordIndex - 1][0], coords[gpxCoordIndex][1], coords[gpxCoordIndex][0]);

            // Check if adding this point exceeds the major section boundary
            if (cumulativeDistance + distanceWithinSection + dist > sectionEnd.distance) {
                // This point is in the next major section, break to the outer loop
                break;
            }

            distanceCoveredInSegment += dist;
            distanceWithinSection += dist;
            segmentPoints.push(coords[gpxCoordIndex]);

            // Create a 10km segment row if length is met
            if (distanceCoveredInSegment >= segmentLength) {
                const segmentDistance = distanceCoveredInSegment;
                const startEle = segmentPoints[0][2];
                const endEle = segmentPoints[segmentPoints.length - 1][2];
                const elevationChange = endEle - startEle;
                const gradient = (elevationChange / (segmentDistance * 1000)) * 100;

                let adjustedPace = sectionBasePace;
                if (gradient > 0) {
                    adjustedPace *= (1 + (gradient * 0.025)); // 2.5% slower per 1% incline
                } else {
                    adjustedPace *= (1 + (gradient * 0.015)); // 1.5% faster per 1% decline
                }
                const finalPace = adjustedPace * (1 + (backpackWeight * 0.01));
                const segmentTime = finalPace * segmentDistance;

                cumulativeDistance += segmentDistance;
                cumulativeTime += segmentTime;

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${cumulativeDistance.toFixed(2)}</td>
                    <td>${segmentDistance.toFixed(2)}</td>
                    <td>${finalPace.toFixed(2)}</td>
                    <td>${minutesToTimeStr(segmentTime)}</td>
                    <td>${minutesToTimeStr(cumulativeTime)}</td>
                    <td>${elevationChange.toFixed(2)}</td>
                    <td>${gradient.toFixed(2)}</td>
                `;
                tableBody.appendChild(row);

                // Reset for next segment
                distanceCoveredInSegment = 0;
                segmentPoints = [coords[gpxCoordIndex]];
            }
            gpxCoordIndex++;
        }

        // Add the cut-off row for the end of the major section
        const arrivalTime = sectionStart.time + sectionTimeBudget;
        const cutOffRow = document.createElement("tr");
        cutOffRow.className = 'cut-off-row';
        cutOffRow.innerHTML = `
            <td colspan="7" style="text-align: center;">
              <strong>${sectionEnd.name} @ ${sectionEnd.distance.toFixed(2)} km</strong> |
              Arrival: ${minutesToTimeStr(arrivalTime)} |
              Cut-off: ${minutesToTimeStr(sectionEnd.time)}
            </td>
        `;
        tableBody.appendChild(cutOffRow);
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
