window.addEventListener("load", async () => {
  const map = L.map("map").setView([68.5, 21.5], 8);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  // Aid station definitions
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

  const fetchGPX = async () => {
    const res = await fetch("nuts300.gpx");
    const gpxText = await res.text();
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxText, "application/xml");
    return toGeoJSON.gpx(gpxDoc);
  };

  const formatTime = (date) =>
    date.toLocaleString("en-GB", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const parseCutoff = (label) => {
    const parts = label.split(" ");
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();
    const cutoff = new Date(now);
    const targetDay = weekdays.indexOf(parts[0]);
    const currentDay = now.getDay();
    const daysDiff = (targetDay - currentDay + 7) % 7;
    cutoff.setDate(now.getDate() + daysDiff);
    const [hour, minute] = parts[1].split(":").map(Number);
    cutoff.setHours(hour, minute, 0, 0);
    return cutoff;
  };

  const updatePlanner = (geojson) => {
    const goalInput = document.getElementById("goal-time");
    const output = document.getElementById("planner-output");

    const refresh = () => {
      const goalHours = parseFloat(goalInput.value);
      const totalRest = aidStations.reduce((sum, s) => sum + (s.rest || 0), 0);
      const movingHours = goalHours - totalRest;
      const totalKm = aidStations[aidStations.length - 1].km;
      const paceMinPerKm = (movingHours * 60) / totalKm;

      let currentTime = new Date();
      currentTime.setHours(12, 0, 0, 0); // Assume start Monday 12:00

      let result = `<p>Goal Time: <strong>${goalHours}h</strong>, Pace: ${paceMinPerKm.toFixed(1)} min/km</p>`;
      result += `<table border="1" cellpadding="4"><tr>
        <th>Station</th><th>KM</th><th>Arrival</th><th>Rest</th><th>Cutoff</th><th>Status</th></tr>`;

      for (let i = 0; i < aidStations.length; i++) {
        const station = aidStations[i];
        const prev = aidStations[i - 1];
        const dist = i === 0 ? 0 : station.km - prev.km;
        const movingMinutes = dist * paceMinPerKm;
        currentTime = new Date(currentTime.getTime() + movingMinutes * 60 * 1000);
        const arrivalStr = formatTime(currentTime);

        let status = "✅";
        if (station.cutoff) {
          const cutoffTime = parseCutoff(station.cutoff);
          const totalArrival = new Date(currentTime.getTime() + (station.rest || 0) * 3600 * 1000);
          if (totalArrival > cutoffTime) {
            status = "🔴 Exceeds cutoff!";
          }
        }

        result += `<tr>
          <td>${station.name}</td>
          <td>${station.km} km</td>
          <td>${arrivalStr}</td>
          <td>${station.rest} h</td>
          <td>${station.cutoff || "-"}</td>
          <td>${status}</td>
        </tr>`;

        currentTime = new Date(currentTime.getTime() + (station.rest || 0) * 3600 * 1000);
      }

      result += "</table>";
      output.innerHTML = result;
    };

    goalInput.addEventListener("input", refresh);
    refresh();
  };

  try {
    const geojson = await fetchGPX();

    const route = L.geoJSON(geojson, {
      style: { color: "blue", weight: 3 }
    }).addTo(map);

    const latlngs = geojson.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
    map.fitBounds(latlngs);

    // Elevation chart
    const elevation = geojson.features[0].geometry.coordinates.map((coord, i) => ({
      distance: i / 10,
      ele: coord[2] || 0,
    }));

    const chart = echarts.init(document.getElementById("chart"));
    chart.setOption({
      tooltip: { trigger: "axis" },
      xAxis: { type: "value", name: "Distance (km)" },
      yAxis: { type: "value", name: "Elevation (m)" },
      series: [{ type: "line", data: elevation.map(p => [p.distance, p.ele]), areaStyle: {} }],
    });

    // Aid station markers
    aidStations.forEach((station) => {
      const km = station.km;
      const totalDistance = elevation.length / 10;
      const idx = Math.floor((km / totalDistance) * elevation.length);
      const coord = latlngs[idx];
      if (coord) {
        L.marker(coord)
          .addTo(map)
          .bindPopup(`${station.name} (${km} km)`);
      }
    });

    updatePlanner(geojson);
  } catch (err) {
    console.error("Error loading GPX:", err);
  }

  // Service worker registration
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then(() => {
      console.log("✅ Service Worker registered");
    });
  }
});
