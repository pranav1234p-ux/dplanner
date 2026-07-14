"use client";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

// Official national boundary of India (Government of India / Survey of India view —
// includes the full extent of Jammu & Kashmir, Ladakh and Arunachal Pradesh).
// Source: DataMeet maps (india-composite), simplified for web display.
// Built directly with L.polygon (GeoJSON coordinates are [lng,lat] -> [lat,lng])
// so it renders reliably and stays non-interactive.
export function IndiaBoundary() {
  const map = useMap();

  // If the map is first laid out at zero height (e.g. inside a flex panel that
  // sizes after mount), Leaflet projects vector layers to an empty path. Observe
  // the container and invalidate size so all layers re-project once it has size.
  useEffect(() => {
    const container = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    ro.observe(container);
    return () => ro.disconnect();
  }, [map]);

  useEffect(() => {
    let active = true;
    let layer: L.LayerGroup | null = null;

    fetch("/india-boundary.geojson")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geom: any =
          data.type === "GeometryCollection"
            ? data.geometries[0]
            : data.type === "FeatureCollection"
              ? data.features[0].geometry
              : data.geometry ?? data;
        if (!geom?.coordinates) return;

        // MultiPolygon: [ polygon[ ring[ [lng,lat] ] ] ] -> convert to [lat,lng].
        const polys: [number, number][][][] =
          geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
        const latlngs = polys.map((poly) =>
          poly.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number])),
        ) as unknown as L.LatLngExpression[][][];

        // Dark casing underneath + bright green on top => high contrast against
        // any base map (dark tactical, light street, satellite imagery, terrain).
        const casing = L.polygon(latlngs, {
          color: "#000000",
          weight: 4,
          opacity: 0.55,
          fill: false,
          interactive: false,
        });
        const main = L.polygon(latlngs, {
          color: "#4ade80",
          weight: 2,
          opacity: 1,
          fill: false,
          interactive: false,
        });
        layer = L.layerGroup([casing, main]);
        layer.addTo(map);
      })
      .catch(() => {});

    return () => {
      active = false;
      if (layer) layer.remove();
    };
  }, [map]);

  return null;
}

// Bounds that keep the map focused on the Indian region.
export const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [5.5, 66.0],
  [38.5, 99.5],
];
export const INDIA_CENTER: [number, number] = [22.9734, 78.6569];
