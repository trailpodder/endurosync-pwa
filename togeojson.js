// Minimal browser-compatible GPX to GeoJSON converter
window.toGeoJSON = {
  gpx: function (doc) {
    const tracks = Array.from(doc.getElementsByTagName('trk'));
    const features = tracks.map(trk => {
      const segments = Array.from(trk.getElementsByTagName('trkseg')).map(seg => {
        const trkpts = Array.from(seg.getElementsByTagName('trkpt'));
        return trkpts.map(pt => {
          const lat = parseFloat(pt.getAttribute('lat'));
          const lon = parseFloat(pt.getAttribute('lon'));
          const eleEl = pt.getElementsByTagName('ele')[0];
          const ele = eleEl ? parseFloat(eleEl.textContent) : 0;
          return [lon, lat, ele];
        });
      }).flat();
      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: segments
        },
        properties: {}
      };
    });

    return {
      type: "FeatureCollection",
      features: features
    };
  }
};
