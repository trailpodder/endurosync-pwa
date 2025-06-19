var toGeoJSON = (function(){
  function attr(el, name) { return el.getAttribute(name); }
  function nodeVal(el) { return el.textContent; }

  function getCoordinates(trkpts) {
    return Array.from(trkpts).map(pt => [
      parseFloat(attr(pt, "lon")),
      parseFloat(attr(pt, "lat")),
      parseFloat(nodeVal(pt.getElementsByTagName("ele")[0]))
    ]);
  }

  function gpx(doc) {
    var trkpts = doc.getElementsByTagName("trkpt");
    return {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: getCoordinates(trkpts)
        }
      }]
    };
  }

  return { gpx: gpx };
})();