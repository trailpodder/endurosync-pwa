// Minimal browser version of togeojson
(function(global) {
  const togeojson = (function(){
    // Only GPX needed for your case
    function attr(x) {
      const o = {};
      if (!x || !x.attributes) return o;
      for (let i = 0; i < x.attributes.length; i++) {
        const attr = x.attributes[i];
        o[attr.name] = attr.value;
      }
      return o;
    }

    function nodeVal(x) {
      if (!x || !x.firstChild) return '';
      return x.firstChild.nodeValue;
    }

    function get(x, tag) {
      return x.getElementsByTagName(tag);
    }

    function coordPair(x) {
      return [parseFloat(nodeVal(get(x, 'lon')[0] || x)), parseFloat(nodeVal(get(x, 'lat')[0] || x))];
    }

    function gpx(doc) {
      const tracks = get(doc, 'trk');
      const features = [];

      for (let i = 0; i < tracks.length; i++) {
        const trksegs = get(tracks[i], 'trkseg');
        for (let j = 0; j < trksegs.length; j++) {
          const trkpts = get(trksegs[j], 'trkpt');
          const coords = [];

          for (let k = 0; k < trkpts.length; k++) {
            const pt = trkpts[k];
            coords.push([
              parseFloat(pt.getAttribute('lon')),
              parseFloat(pt.getAttribute('lat')),
              parseFloat(get(pt, 'ele')[0]?.textContent || 0)
            ]);
          }

          features.push({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coords
            }
          });
        }
      }

      return {
        type: 'FeatureCollection',
        features: features
      };
    }

    return { gpx };
  })();

  // ✅ EXPLICITLY export togeojson globally for browser use
  global.togeojson = togeojson;

})(window);
