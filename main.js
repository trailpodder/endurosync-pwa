// main.js
window.addEventListener("DOMContentLoaded", () => {
  const map = L.map("map").setView([68.3, 22.5], 8);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
  }).addTo(map);

  fetch("nuts300.gpx")
    .then((response) => response.text())
    .then((gpxText) => {
      const parser = new DOMParser();
      const gpxDom = parser.parseFromString(gpxText, "application/xml");
      const geojson = toGeoJSON.gpx(gpxDom);

      const gpxLine = L.geoJSON(geojson, {
        style: { color: "blue", weight: 3 },
      }).addTo(map);
      map.fitBounds(gpxLine.getBounds());

      setupPlanner();
    })
    .catch((err) => {
      console.error("Error loading GPX:", err);
    });

  function setupPlanner() {
    const aidStations = [
      {
        name: "Start (Njurgulahti)",
        km: 0,
        cutoff: new Date("2025-06-30T12:00:00"), // Race start
      },
      {
        name: "Kalmankaltio",
        km: 88,
        cutoff: new Date("2025-07-01T12:00:00"), // 24h
      },
      {
        name: "Hetta",
        km: 192,
        cutoff: new Date("2025-07-03T13:00:00"), // 73h
      },
      {
        name: "Pallas",
        km: 256,
        cutoff: new Date("2025-07-04T13:00:00"), // 97h
      },
      {
        name: "Finish (Äkäslompolo)",
        km: 326,
        cutoff: new Date("2025-07-05T18:00:00"), // 126h
      },
    ];

    const rests = [1, 2, 3]; // Default rest hours at Kalmakaltio, Hetta, Pallas
    const goalTotalHours = 96;

    const tableBody = document.querySelector("#pace-table tbody");
    tableBody.innerHTML = "";

    const baseTime = new Date("2025-06-30T12:00:00"); // Race start
    let currentTime = new Date(baseTime);
    let lastKm = 0;
    let totalTime = 0;
    let totalKm = 0;

    for (let i = 1; i < aidStations.length; i++) {
      const segmentKm = aidStations[i].km - lastKm;
      const cutoff = aidStations[i].cutoff;
      const rest = rests[i - 1] || 0;
      const latestArrival = new Date(cutoff.getTime() - (rest + 1) * 60 * 60 * 1000); // 1h margin
      const runTimeHrs = (latestArrival - currentTime) / (1000 * 60 * 60);

      // Avoid negative run time
      const safeRunTimeHrs = Math.max(runTimeHrs, 1);
      const pace = segmentKm / safeRunTimeHrs;

      const arrival = new Date(currentTime.getTime() + safeRunTimeHrs * 60 * 60 * 1000);
      const departure = new Date(arrival.getTime() + rest * 60 * 60 * 1000);

      totalTime += safeRunTimeHrs + rest;
      totalKm += segmentKm;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${aidStations[i - 1].name} → ${aidStations[i].name}</td>
        <td>${segmentKm.toFixed(1)} km</td>
        <td>${safeRunTimeHrs.toFixed(2)} h</td>
        <td>${pace.toFixed(2)} km/h</td>
        <td>${rest} h</td>
        <td>${arrival.toLocaleString("fi-FI", { hour12: false })}</td>
        <td>${cutoff.toLocaleString("fi-FI", { hour12: false })}</td>
      `;
      tableBody.appendChild(row);

      currentTime = departure;
      lastKm = aidStations[i].km;
    }

    const summaryRow = document.createElement("tr");
    summaryRow.innerHTML = `
      <td><strong>Total</strong></td>
      <td><strong>${totalKm} km</strong></td>
      <td><strong>${totalTime.toFixed(2)} h</strong></td>
      <td colspan="4"></td>
    `;
    tableBody.appendChild(summaryRow);
  }
});
