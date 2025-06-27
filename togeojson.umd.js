/*!
 * toGeoJSON, v0.16.0
 * https://github.com/mapbox/togeojson
 * Licensed under ISC
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.toGeoJSON = factory();
    }
}(this, function () {
    'use strict';

    function get(x, key) {
        return x.getElementsByTagName(key);
    }

    function attr(x, key) {
        return x.getAttribute(key);
    }

    function nodeVal(x) {
        if (!x) return '';
        return x.textContent || x.innerText || '';
    }

    function get1(x, key) {
        var found = get(x, key);
        if (found.length) return found[0];
        return null;
    }

    function coord1(v) {
        return parseFloat(v);
    }

    function coordPair(x) {
        return [coord1(nodeVal(get1(x, 'longitude'))),
                coord1(nodeVal(get1(x, 'latitude')))];
    }

    function getTime(x) {
        var when = get1(x, 'Time');
        if (when) return nodeVal(when);
    }

    function getCoordsLine(line) {
        var coords = [];
        var coordsEl = get(line, 'coord');
        for (var i = 0; i < coordsEl.length; i++) {
            var el = coordsEl[i];
            var lon = coord1(get1(el, 'longitude'));
            var lat = coord1(get1(el, 'latitude'));
            coords.push([lon, lat]);
        }
        return coords;
    }

    function parseGpx(xml) {
        var g = {
            type: 'FeatureCollection',
            features: []
        };

        var tracks = get(xml, 'trk');
        for (var i = 0; i < tracks.length; i++) {
            var track = tracks[i];
            var name = nodeVal(get1(track, 'name'));
            var segments = get(track, 'trkseg');
            var coords = [];

            for (var j = 0; j < segments.length; j++) {
                var segpts = get(segments[j], 'trkpt');
                var segment = [];

                for (var k = 0; k < segpts.length; k++) {
                    var pt = segpts[k];
                    var lon = parseFloat(pt.getAttribute('lon'));
                    var lat = parseFloat(pt.getAttribute('lat'));
                    var ele = get1(pt, 'ele');
                    var elevation = ele ? parseFloat(nodeVal(ele)) : undefined;
                    var time = getTime(pt);

                    var coord = [lon, lat];
                    if (typeof elevation !== 'undefined') coord.push(elevation);

                    segment.push(coord);
                }

                coords.push(segment);
            }

            g.features.push({
                type: 'Feature',
                properties: { name: name },
                geometry: {
                    type: 'MultiLineString',
                    coordinates: coords
                }
            });
        }

        var waypoints = get(xml, 'wpt');
        for (var i = 0; i < waypoints.length; i++) {
            var wpt = waypoints[i];
            var lon = parseFloat(wpt.getAttribute('lon'));
            var lat = parseFloat(wpt.getAttribute('lat'));
            var name = nodeVal(get1(wpt, 'name'));

            g.features.push({
                type: 'Feature',
                properties: { name: name },
                geometry: {
                    type: 'Point',
                    coordinates: [lon, lat]
                }
            });
        }

        return g;
    }

    return {
        gpx: parseGpx
    };
}));
