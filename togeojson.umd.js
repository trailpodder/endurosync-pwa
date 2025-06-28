(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.togeojson = {}));
})(this, (function (exports) {
  'use strict';

  function get(node, tag) {
    return node.getElementsByTagName(tag);
  }

  function attr(node, attrName) {
    return node.getAttribute(attrName);
  }

  function nodeVal(node) {
    if (!node) return '';
    return node.textContent || node.innerText || '';
  }

  function get1(node, tag) {
    return get(node, tag)[0];
  }

  function coordPair(node) {
    return [parseFloat(attr(node, 'lon')), parseFloat(attr(node, 'lat'))];
  }

  function coordPairEle(node) {
    const coords = coordPair(node);
    const ele = get(node, 'ele');
    if (ele.length) coords.push(parseFloat(nodeVal(ele[0])));
    return coords;
  }

  function getLine(node, options) {
    const line = [];
    const pts = get(node, 'trkpt');
    for (let i = 0; i < pts.length; i++) {
      line.push(coordPairEle(pts[i]));
    }
    return line;
  }

  function extractTrk(trk, options) {
    const nameEl = get1(trk, 'name');
    const name = nameEl ? nodeVal(nameEl) : undefined;

    const line = [];
    const segments = get(trk, 'trkseg');
    for (let i = 0; i < segments.length; i++) {
      line.push(getLine(segments[i], options));
    }

    return {
      type: 'Feature',
      properties: { name: name },
      geometry: {
        type: 'MultiLineString',
        coordinates: line
      }
    };
  }

  function extractWpt(wpt) {
    const props = {};
    const nameEl = get1(wpt, 'name');
    if (nameEl) props.name = nodeVal(nameEl);

    return {
      type: 'Feature',
      properties: props,
      geometry: {
        type: 'Point',
        coordinates: coordPairEle(wpt)
      }
    };
  }

  function gpx(doc, options = {}) {
    const tracks = get(doc, 'trk');
    const waypoints = get(doc, 'wpt');

    const features = [];

    for (let i = 0; i < tracks.length; i++) {
      features.push(extractTrk(tracks[i], options));
    }

    for (let j = 0; j < waypoints.length; j++) {
      features.push(extractWpt(waypoints[j]));
    }

    return {
      type: 'FeatureCollection',
      features: features
    };
  }

  exports.gpx = gpx;

}));
