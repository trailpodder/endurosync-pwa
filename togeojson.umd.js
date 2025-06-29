(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.toGeoJSON = {}));
}(this, (function(exports) {
  'use strict';

  function getPoints(node) {
    var pts = node.getElementsByTagName('trkpt');
    var line = [];
    for (var i = 0; i < pts.length; i++) {
      var lat = parseFloat(pts[i].getAttribute('lat'));
      var lon = parseFloat(pts[i].getAttribute('lon'));
      line.push([lon, lat]);
    }
    return line;
  }

  function gpx(doc) {
    var trks = doc.getElementsByTagName('trk');
    var features = [];

    for (var i = 0; i < trks.length; i++) {
      var nameEl = trks[i].getElementsByTagName('name')[0];
      var name = nameEl ? nameEl.textContent : undefined;

      var feature = {
        type: 'Feature',
        properties: { name: name },
        geometry: {
          type: 'LineString',
          coordinates: getPoints(trks[i])
        }
      };
      features.push(feature);
    }

    return {
      type: 'FeatureCollection',
      features: features
    };
  }

  exports.gpx = gpx;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
