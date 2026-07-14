"use client";
import { useEffect, useState } from "react";
import L from "leaflet";
import { Marker, useMap } from "react-leaflet";
import type { Marking } from "@/components/planner/map-config";

// Names show once the visible area is ~400×400 km or tighter; distances only
// at ~100×100 km or tighter — so wide (country-scale) views stay uncluttered.
const NAME_SPAN_KM = 400;
const DISTANCE_SPAN_KM = 100;

function useVisibleWidthKm(): number {
  const map = useMap();
  const [widthKm, setWidthKm] = useState(Infinity);
  useEffect(() => {
    const update = () => {
      const b = map.getBounds();
      const c = b.getCenter();
      setWidthKm(map.distance([c.lat, b.getWest()], [c.lat, b.getEast()]) / 1000);
    };
    update();
    map.on("zoomend moveend", update);
    return () => {
      map.off("zoomend moveend", update);
    };
  }, [map]);
  return widthKm;
}

export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Strong dark halo so white text stays readable on ANY base map — dark tactical,
// light street/terrain, or satellite imagery (white on black, outlined on white).
const HALO =
  "text-shadow:0 0 2px #000,0 0 3px #000,1px 1px 1px #000,-1px -1px 1px #000,1px -1px 1px #000,-1px 1px 1px #000;";
// Map marking labels use a Times New Roman serif face.
const FONT = "font-family:'Times New Roman',Times,serif;";

// Name label (with the creator), anchored just above its point.
const pillIcon = (name: string, creator: string | null | undefined, _color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-115%);white-space:nowrap;text-align:center;${FONT}${HALO}">
      <div style="font-size:12px;font-weight:800;color:#ffffff;line-height:1.2">${name}</div>
      ${creator ? `<div style="font-size:9.5px;font-weight:700;color:#ffffff;line-height:1.2">by ${creator}</div>` : ""}
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

// Distance / radius label, centred on a shape edge midpoint.
const distIcon = (text: string) =>
  L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-50%);white-space:nowrap;font-size:11px;font-weight:700;color:#ffffff;${FONT}${HALO}">${text}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

/** Midpoint + length labels for each edge of a polyline/polygon. */
export function edgeLabels(points: [number, number][], closed: boolean) {
  const out: { pos: [number, number]; text: string }[] = [];
  const n = points.length;
  const end = closed ? n : n - 1;
  for (let i = 0; i < end; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    if (!a || !b) continue;
    out.push({ pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], text: `${haversineKm(a, b).toFixed(2)} km` });
  }
  return out;
}

/** Renders a marking's on-map labels: a coloured name pill (with creator), the
 *  circle radius, and polygon side distances / total line length. */
export function MarkingLabels({ m, color }: { m: Marking; color: string }) {
  const widthKm = useVisibleWidthKm();
  const showNames = widthKm <= NAME_SPAN_KM;
  const showDistances = widthKm <= DISTANCE_SPAN_KM;
  let namePos: [number, number] | null = null;
  const dist: { pos: [number, number]; text: string }[] = [];

  if (m.shapeType === "circle" && m.coordinates.length >= 1) {
    const [lat, lng, radius] = [m.coordinates[0][0], m.coordinates[0][1], m.coordinates[0][2] ?? 0];
    const radiusDeg = radius / 111000;
    namePos = [lat + radiusDeg, lng];
    dist.push({ pos: [lat, lng], text: `r = ${(radius / 1000).toFixed(2)} km` });
  } else if (m.shapeType === "rectangle" && m.coordinates.length >= 2) {
    const [a, b] = m.coordinates as [number, number][];
    const corners: [number, number][] = [a, [a[0], b[1]], b, [b[0], a[1]]];
    namePos = [Math.max(a[0], b[0]), (a[1] + b[1]) / 2];
    edgeLabels(corners, true).forEach((e) => dist.push(e));
  } else {
    const pts = m.coordinates as [number, number][];
    if (pts.length) namePos = pts.reduce((best, p) => (p[0] > best[0] ? p : best), pts[0]);
    if (m.shapeType === "polygon") {
      edgeLabels(pts, true).forEach((e) => dist.push(e));
    } else if (pts.length >= 2) {
      // Line: total length (sum of all segments) as a single label.
      let total = 0;
      for (let i = 1; i < pts.length; i++) total += haversineKm(pts[i - 1], pts[i]);
      const mi = Math.floor((pts.length - 1) / 2);
      const a = pts[mi];
      const b = pts[mi + 1] ?? a;
      dist.push({ pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], text: `${total.toFixed(2)} km` });
    }
  }

  return (
    <>
      {showNames && namePos && (
        <Marker position={namePos} icon={pillIcon(m.name, m.createdByName, color)} interactive={false} />
      )}
      {showDistances &&
        dist.map((d, i) => (
          <Marker key={i} position={d.pos} icon={distIcon(d.text)} interactive={false} />
        ))}
    </>
  );
}
