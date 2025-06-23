// togeojson.js (ES module version)

export function gpx(doc) {
  const ns = {
    gpx: 'http://www.topografix.com/GPX/1/1',
  };

  function get(x, tag) {
    return x.getElementsByTagName(tag)[0];
  }

  function nodeVal(x) {
    return x && x.textContent;
  }

  function coordPair(trkpt) {
    return [
      parseFloat(trkpt.getAttribute('lon')),
      parseFloat(trkpt.getAttribute('lat')),
    ];
  }

  const geojson = {
    type: 'FeatureCollection',
    features: [],
  };

  const tracks = doc.getElementsByTagName('trk');
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const segments = track.getElementsByTagName('trkseg');
    for (let j = 0; j < segments.length; j++) {
      const segment = segments[j];
      const trkpts = segment.getElementsByTagName('trkpt');
      const coords = [];
      for (let k = 0; k < trkpts.length; k++) {
        const pt = trkpts[k];
        const coord = coordPair(pt);
        const ele = get(pt, 'ele');
        if (ele) coord.push(parseFloat(ele.textContent));
        coords.push(coord);
      }
      geojson.features.push({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
      });
    }
  }

  return geojson;
}
