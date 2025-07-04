// Minimal standalone version of toGeoJSON.gpx
// Source: https://github.com/mapbox/togeojson

(function() {
  function get(text, node) {
    return node.getElementsByTagName(text);
  }

  function attr(node, attr) {
    return node.getAttribute(attr);
  }

  function nodeVal(node) {
    return node && node.textContent;
  }

  function coordPair(node) {
    return [parseFloat(nodeVal(get("lon", node)[0])),
            parseFloat(nodeVal(get("lat", node)[0]))];
  }

  function parseGPX(gpx) {
    const trks = get("trk", gpx);
    const features = [];

    for (let i = 0; i < trks.length; i++) {
      const trksegs = get("trkseg", trks[i]);
      const coords = [];

      for (let j = 0; j < trksegs.length; j++) {
        const trkpts = get("trkpt", trksegs[j]);
        for (let k = 0; k < trkpts.length; k++) {
          const pt = trkpts[k];
          coords.push([
            parseFloat(attr(pt, "lon")),
            parseFloat(attr(pt, "lat"))
          ]);
        }
      }

      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: coords
        },
        properties: {}
      });
    }

    return {
      type: "FeatureCollection",
      features
    };
  }

  const toGeoJSON = {
    gpx: parseGPX
  };

  window.toGeoJSON = toGeoJSON;
})();
