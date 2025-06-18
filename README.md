# 🏃‍♂️ EnduroSync – NUTS 300 Planner (PWA)

**EnduroSync** is a mobile-ready planning and pacing tool for ultrarunners preparing for the legendary [NUTS 300](https://nutsyllaspallas.com/fi/nuts300/) — a 326 km Arctic ultra with 8500 m of elevation gain in Finnish Lapland.

> This is a prototype built as a Progressive Web App (PWA) with offline support, GPX file loading, elevation charts, cutoff overlays, and pacing estimates.

---

## 🔧 Features

- 🗺️ GPX track visualization with Leaflet.js
- 📈 Elevation profile with aid station markers (Chart.js)
- ⏱️ Dynamic goal time + cutoff visualization
- 🧠 Pacing overlay (based on effort + terrain)
- 🪫 Live time remaining display
- 📲 Works offline (PWA)
- 🔄 Supports local GPX uploads and future data sync

---

## 🏁 NUTS 300 Race Info

- **Start**: Monday at 12:00 – Njurkulahti
- **Finish**: Saturday 18:00 – Äkäslompolo
- **Cutoffs**:
  - ⛺ Kalmankaltio (88 km): Tuesday 12:00 (24h)
  - ⛰️ Hetta (206 km): Thursday 13:00 (73h)
  - 🏔️ Pallas (261 km): Friday 13:00 (97h)

---

## 📦 Install as a PWA

This project supports offline mode and mobile install:

1. Visit the deployed app in a browser (see below).
2. On mobile, tap **“Add to Home Screen”**.
3. Use offline in the field!

---

## 🚀 Run the App

If deployed via GitHub Pages:

```bash
https://<your-username>.github.io/endurosync-pwa/
Otherwise, just open index.html in your browser locally.

📁 endurosync-pwa/
├── index.html
├── main.js
├── togeojson.js
├── manifest.json

📋 Roadmap
 Upload & parse real GPX file

 Add Firebase/Supabase sync

 Real-time effort scoring (D-TES)

 AI-based pacing feedback

 Course-specific adaptation module

👤 Author
Built by an ultrarunner and AI enthusiast preparing for NUTS 300.

📜 License
MIT — free to use, remix, and improve.


