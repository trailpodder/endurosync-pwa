let map = L.map('map').setView([68.4, 23.6], 9);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let chart = new Chart(document.getElementById('chart'), {
  type: 'line',
  data: {
    labels: [],
    datasets: [{ label: 'Elevation (m)', data: [], borderColor: 'blue', fill: false }]
  },
  options: {
    responsive: true,
    scales: { x: { title: { display: true, text: 'Distance (km)' } } }
  }
});

document.getElementById('gpxInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(event.target.result, "text/xml");
    const trkpts = Array.from(xml.getElementsByTagName("trkpt"));

    let latlngs = [];
    let distances = [0];
    let elevations = [];
    let totalDist = 0;

    for (let i = 1; i < trkpts.length; i++) {
      const lat1 = parseFloat(trkpts[i - 1].getAttribute("lat"));
      const lon1 = parseFloat(trkpts[i - 1].getAttribute("lon"));
      const lat2 = parseFloat(trkpts[i].getAttribute("lat"));
      const lon2 = parseFloat(trkpts[i].getAttribute("lon"));
      const ele = parseFloat(trkpts[i].getElementsByTagName("ele")[0]?.textContent || "0");
      const dist = haversine(lat1, lon1, lat2, lon2);
      totalDist += dist;
      distances.push(totalDist);
      elevations.push(ele);
      latlngs.push([lat2, lon2]);
    }

    L.polyline(latlngs, { color: 'blue' }).addTo(map);
    map.fitBounds(L.polyline(latlngs).getBounds());

    chart.data.labels = distances.map(d => d.toFixed(1));
    chart.data.datasets[0].data = elevations;
    chart.update();
  };
  reader.readAsText(file);
});

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c) / 1000;
}

function exportPlan() {
  const goalTime = parseFloat(document.getElementById('goalTime').value || "100");
  const blob = new Blob([JSON.stringify({ goalTime })], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plan.json";
  a.click();
  URL.revokeObjectURL(url);
}
