# 🏃‍♂️ EnduroSync – NUTS 300 Planner (PWA)

[![Status](https://img.shields.io/badge/status-prototype-orange)](https://github.com/trailpodder/endurosync-pwa)
[![View Demo](https://img.shields.io/badge/View-Demo-blue?logo=github)](https://trailpodder.github.io/endurosync-pwa/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![Built With](https://img.shields.io/badge/built%20with-JavaScript%20%7C%20Leaflet%20%7C%20Chart.js-yellow)

**EnduroSync** is a mobile-ready planning and pacing tool for ultrarunners preparing for the legendary [NUTS 300](https://nutsyllaspallas.com/fi/nuts300/) — a 326 km Arctic ultra with 4500 m of elevation gain in Finnish Lapland.

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

1. Visit the deployed app:  
   👉 [https://trailpodder.github.io/endurosync-pwa/](https://trailpodder.github.io/endurosync-pwa/)
2. On mobile, tap **“Add to Home Screen”**
3. Use offline in the field!

---

## 🗂️ Project Structure

📁 endurosync-pwa/
├── index.html
├── main.js
├── togeojson.js
├── manifest.json
├── service-worker.js
├── icons/
│ ├── icon-192.png
│ └── icon-512.png


---

## 📋 Roadmap

- [ ] Upload & parse real GPX file
- [ ] Add Firebase/Supabase sync
- [ ] Real-time effort scoring (D-TES)
- [ ] AI-based pacing feedback
- [ ] Course-specific adaptation module

---

## 👤 Author

Developed by [trailpodder](https://github.com/trailpodder), an ultrarunner building tools for adaptive trail running strategy.

---

## 📜 License

MIT — free to use, remix, and improve.

