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

function analyzeSectionTerrain(startKm, endKm) {
    if (!parsedGpxData) return { distance: 0, elevationGain: 0, effort: 0 };

    const coords = parsedGpxData.features[0].geometry.coordinates;
    let distanceCovered = 0;
    let sectionDistance = 0;
    let sectionElevationGain = 0;
    let inSection = false;

    for (let i = 1; i < coords.length; i++) {
        const p1 = coords[i - 1];
        const p2 = coords[i];
        const segmentDistance = calculateDistance(p1[1], p1[0], p2[1], p2[0]);

        if (!inSection && distanceCovered + segmentDistance >= startKm) {
            inSection = true;
        }

        if (inSection) {
            sectionDistance += segmentDistance;
            const elevationDiff = p2[2] - p1[2];
            if (elevationDiff > 0) {
                sectionElevationGain += elevationDiff;
            }
        }

        distanceCovered += segmentDistance;

        if (distanceCovered >= endKm) {
            break; // Stop after the section ends
        }
    }

    // Effort heuristic: 1m of elevation gain is like 10m of flat distance.
    const effort = sectionDistance + (sectionElevationGain / 1000) * 10;
    return { distance: sectionDistance, elevationGain: sectionElevationGain, effort: effort };
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

    // 2. Analyze terrain and effort for each section
    const sections = [];
    for (let i = 0; i < cutOffs.length - 1; i++) {
        const sectionStart = cutOffs[i];
        const sectionEnd = cutOffs[i + 1];
        const terrain = analyzeSectionTerrain(sectionStart.distance, sectionEnd.distance);
        sections.push({
            name: `${sectionStart.name} to ${sectionEnd.name}`,
            ...terrain,
            officialDeadline: sectionEnd.time
        });
    }

    // 3. Apply fatigue factor and calculate total effort
    const fatigueFactors = [1.0, 1.0, 1.1, 1.25]; // Heuristics
    sections.forEach((section, i) => {
        section.fatiguedEffort = section.effort * fatigueFactors[i];
    });
    const totalFatiguedEffort = sections.reduce((sum, s) => sum + s.fatiguedEffort, 0);

    // 4. Iteratively allocate time and check against cut-offs
    let remainingTime = goalTimeMinutes;
    let remainingEffort = totalFatiguedEffort;
    let cumulativeTime = 0;

    for (const section of sections) {
        // Allocate time based on proportion of remaining effort
        let sectionTime = remainingTime * (section.fatiguedEffort / remainingEffort);

        // Check against cut-off (if not the finish section)
        const isFinishSection = section.name.includes('Finish');
        if (!isFinishSection) {
            const maxAllowedTime = (section.officialDeadline - bufferMinutes) - cumulativeTime;
            if (sectionTime > maxAllowedTime) {
                sectionTime = maxAllowedTime;
            }
        }

        if (sectionTime <= 0) {
            alert(`Impossible plan. The time budget for section "${section.name}" is zero or negative. Try a faster goal time.`);
            document.querySelector("#newPacingTable tbody").innerHTML = "";
            return;
        }

        section.allocatedTime = sectionTime;
        cumulativeTime += sectionTime;
        remainingTime -= sectionTime;
        remainingEffort -= section.fatiguedEffort;
    }

    // 5. Generate table
    const tableBody = document.querySelector("#newPacingTable tbody");
    tableBody.innerHTML = "";
    let arrivalTime = 0;
    for (const section of sections) {
        arrivalTime += section.allocatedTime;
        const avgPace = section.allocatedTime / section.distance;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${section.name}</td>
            <td>${section.distance.toFixed(2)}</td>
            <td>${minutesToTimeStr(section.allocatedTime)}</td>
            <td>${avgPace.toFixed(2)}</td>
            <td>${minutesToTimeStr(arrivalTime)}</td>
            <td>${minutesToTimeStr(section.officialDeadline)}</td>
        `;
        tableBody.appendChild(row);
    }
}

let map = null; // Keep a reference to the map instance

function findCoordsForDistance(targetDistance) {
    if (!parsedGpxData) return null;

    const coords = parsedGpxData.features[0].geometry.coordinates;
    let distanceCovered = 0;

    if (targetDistance === 0) {
        return [coords[0][1], coords[0][0]];
    }

    for (let i = 1; i < coords.length; i++) {
        const segmentDistance = calculateDistance(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]);
        if (distanceCovered + segmentDistance >= targetDistance) {
            // Found the segment where the target distance lies. Return the coordinates of the end of this segment.
            return [coords[i][1], coords[i][0]];
        }
        distanceCovered += segmentDistance;
    }
    // If targetDistance is greater than total, return the last coordinate
    return [coords[coords.length - 1][1], coords[coords.length - 1][0]];
}

function initializeMap(gpxData) {
    if (map) {
        map.remove();
    }
    map = L.map('map');

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const coords = gpxData.features[0].geometry.coordinates;
    const latLngs = coords.map(coord => [coord[1], coord[0]]); // Leaflet uses [lat, lng]

    const route = L.polyline(latLngs, { color: 'blue' }).addTo(map);
    map.fitBounds(route.getBounds());

    // Add markers for cut-off points
    cutOffs.forEach(cutOff => {
        if (cutOff.distance > 0) { // Don't add a marker for the "Start"
            const coords = findCoordsForDistance(cutOff.distance);
            if (coords) {
                L.marker(coords).addTo(map)
                    .bindPopup(`<b>${cutOff.name}</b><br>${cutOff.distance} km`);
            }
        }
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

    initializeMap(parsedGpxData);
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
