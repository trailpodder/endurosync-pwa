(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.toGeoJSON = {}));
})(this, (function (exports) {
  'use strict';

  function getTracks(doc) {
    const tracks = [];
    const trks = doc.getElementsByTagName('trk');
    for (let i = 0; i < trks.length; i++) {
      const trksegs = trks[i].getElementsByTagName('trkseg');
      const coords = [];
      for (let j = 0; j < trksegs.length; j++) {
        const trkpts = trksegs[j].getElementsByTagName('trkpt');
        for (let k = 0; k < trkpts.length; k++) {
          const pt = trkpts[k];
          const lat = parseFloat(pt.getAttribute('lat'));
          const lon = parseFloat(pt.getAttribute('lon'));
          const ele = pt.getElementsByTagName('ele')[0];
          const elevation = ele ? parseFloat(ele.textContent) : undefined;
          coords.push([lon, lat, elevation]);
        }
      }
      tracks.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: coords
        },
        properties: {}
      });
    }
    return tracks;
  }

  function getWaypoints(doc) {
    const wpts = doc.getElementsByTagName('wpt');
    const features = [];
    for (let i = 0; i < wpts.length; i++) {
      const wpt = wpts[i];
      const lat = parseFloat(wpt.getAttribute('lat'));
      const lon = parseFloat(wpt.getAttribute('lon'));
      const ele = wpt.getElementsByTagName('ele')[0];
      const elevation = ele ? parseFloat(ele.textContent) : undefined;
      const name = wpt.getElementsByTagName('name')[0];
      const properties = {};
      if (name) properties.name = name.textContent;
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat, elevation]
        },
        properties
      });
    }
    return features;
  }

  function gpx(doc) {
    const features = [];
    features.push(...getTracks(doc));
    features.push(...getWaypoints(doc));
    return {
      type: 'FeatureCollection',
      features
    };
  }

  exports.gpx = gpx;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
