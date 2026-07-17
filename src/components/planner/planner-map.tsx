"use client";
import * as React from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Polygon,
  Circle,
  Rectangle,
  useMapEvents,
} from "react-leaflet";
import { MAP_LAYERS, markingColor, type LatLng, type Waypoint, type Shape, type Marking } from "./map-config";
import { IndiaBoundary, INDIA_BOUNDS } from "./india-boundary";
import { MapViewMemory } from "./map-view-memory";
import { CursorCoords } from "./cursor-coords";
import { MarkingLabels } from "@/components/marking/marking-labels";
import { markerPinIcon } from "@/components/marking/marker-icon";

export { MAP_LAYERS };
export type { LatLng, Waypoint, Shape, Marking };

function waypointIcon(index: number) {
  return L.divIcon({
    className: "",
    html: `<div style="
      display:grid;place-items:center;width:26px;height:26px;border-radius:50%;
      background:#38bdf8;color:#05070d;font-weight:700;font-size:12px;
      border:2px solid #05070d;box-shadow:0 0 10px rgba(56,189,248,.7)">${index}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function ClickHandler({ onAdd }: { onAdd: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onAdd({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function PlannerMap({
  layer,
  waypoints,
  shapes,
  markings,
  onAddWaypoint,
  center = [22.9734, 78.6569],
  zoom = 5,
  interactive = true,
  showMarkingLabels = true,
  viewMemoryId,
}: {
  layer: keyof typeof MAP_LAYERS;
  waypoints: Waypoint[];
  shapes: Shape[];
  markings: Marking[];
  onAddWaypoint?: (p: LatLng) => void;
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
  showMarkingLabels?: boolean;
  /** Set to remember this map's centre/zoom across tab switches. Read-only previews
   *  leave it unset so they don't share a view with the planner. */
  viewMemoryId?: string;
}) {
  const tl = MAP_LAYERS[layer];
  const line = waypoints.map((w) => [w.lat, w.lng] as [number, number]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full"
      zoomControl={interactive}
      scrollWheelZoom={interactive}
      dragging={interactive}
      minZoom={4}
      maxBounds={INDIA_BOUNDS}
      maxBoundsViscosity={0.6}
    >
      <TileLayer url={tl.url} attribution={tl.attribution} />
      {/* English place-name / boundary labels for imagery layers (e.g. satellite) */}
      {tl.reference && <TileLayer key={`ref-${layer}`} url={tl.reference} />}
      <IndiaBoundary />
      {viewMemoryId && <MapViewMemory id={viewMemoryId} />}
      <CursorCoords />

      {interactive && onAddWaypoint && <ClickHandler onAdd={onAddWaypoint} />}

      {/* Map markings — no-fly (red), restricted (amber), custom (own color), with labels */}
      {markings.map((m) => {
        const color = m.shapeType === "marker" ? m.color : markingColor(m);
        const isLine = m.shapeType === "line";
        const opts = {
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: isLine ? 0 : 0.15,
          dashArray: m.category === "NO_FLY" ? "6 4" : undefined,
        };
        let shape: React.ReactNode;
        if (m.shapeType === "marker" && m.coordinates.length >= 1) {
          shape = <Marker position={m.coordinates[0] as [number, number]} icon={markerPinIcon(color)} />;
        } else if (m.shapeType === "circle" && m.coordinates.length >= 1) {
          const [lat, lng, radius] = [m.coordinates[0][0], m.coordinates[0][1], m.coordinates[0][2] ?? 1000];
          shape = <Circle center={[lat, lng]} radius={radius} pathOptions={opts} />;
        } else if (m.shapeType === "rectangle" && m.coordinates.length >= 2) {
          shape = <Rectangle bounds={m.coordinates as [number, number][]} pathOptions={opts} />;
        } else if (isLine) {
          shape = <Polyline positions={m.coordinates as [number, number][]} pathOptions={opts} />;
        } else {
          shape = <Polygon positions={m.coordinates as [number, number][]} pathOptions={opts} />;
        }
        return (
          <React.Fragment key={m.id}>
            {shape}
            {showMarkingLabels && <MarkingLabels m={m} color={color} />}
          </React.Fragment>
        );
      })}

      {/* User-drawn shapes */}
      {shapes.map((s, i) => {
        const opts = { color: s.color, weight: 2, fillColor: s.color, fillOpacity: 0.15 };
        if (s.objectType === "circle" && s.coordinates.length >= 1) {
          const [lat, lng, radius] = [s.coordinates[0][0], s.coordinates[0][1], s.coordinates[0][2] ?? 1000];
          return <Circle key={i} center={[lat, lng]} radius={radius} pathOptions={opts} />;
        }
        if (s.objectType === "rectangle" && s.coordinates.length >= 2) {
          return <Rectangle key={i} bounds={s.coordinates as [number, number][]} pathOptions={opts} />;
        }
        if (s.objectType === "line") {
          return <Polyline key={i} positions={s.coordinates as [number, number][]} pathOptions={opts} />;
        }
        return <Polygon key={i} positions={s.coordinates as [number, number][]} pathOptions={opts} />;
      })}

      {/* Mission path */}
      {line.length > 1 && (
        <Polyline positions={line} pathOptions={{ color: "#38bdf8", weight: 3, opacity: 0.9 }} />
      )}

      {/* Waypoints */}
      {waypoints.map((w, i) => (
        <Marker key={i} position={[w.lat, w.lng]} icon={waypointIcon(i + 1)} />
      ))}
    </MapContainer>
  );
}
