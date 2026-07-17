"use client";
import { Fragment, useEffect, type ReactNode } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  MapContainer,
  Polygon,
  Polyline,
  Rectangle,
  Circle,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { IndiaBoundary, INDIA_BOUNDS } from "@/components/planner/india-boundary";
import { MapTiles } from "@/components/planner/map-tiles";
import { MapViewMemory } from "@/components/planner/map-view-memory";
import { CursorCoords } from "@/components/planner/cursor-coords";
import { markingColor, type Marking } from "@/components/planner/map-config";
import { MarkingLabels, haversineKm } from "./marking-labels";
import { markerPinIcon } from "./marker-icon";

const dot = (color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #05070d;box-shadow:0 0 8px ${color}"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

function ClickHandler({ onAdd }: { onAdd: (p: [number, number]) => void }) {
  useMapEvents({ click: (e) => onAdd([e.latlng.lat, e.latlng.lng]) });
  return null;
}

/** Pans/zooms the map onto the selected marking when it changes. */
function FocusController({ marking }: { marking?: Marking | null }) {
  const map = useMap();
  useEffect(() => {
    if (!marking || !marking.coordinates.length) return;
    const c = marking.coordinates;
    let bounds: L.LatLngBounds;
    if (marking.shapeType === "circle") {
      const [lat, lng, radius] = [c[0][0], c[0][1], c[0][2] ?? 1000];
      bounds = L.latLng(lat, lng).toBounds(radius * 2.5);
    } else {
      bounds = L.latLngBounds(c.map((p) => [p[0], p[1]] as [number, number]));
    }
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13, animate: true });
  }, [marking, map]);
  return null;
}

function DraftPreview({ shapeType, draft, color }: { shapeType: string; draft: [number, number][]; color: string }) {
  const opts = { color, weight: 2, fillColor: color, fillOpacity: 0.15, dashArray: "5 4" };
  if (shapeType === "circle" && draft.length >= 2) {
    const radius = haversineKm(draft[0], draft[1]) * 1000;
    return <Circle center={draft[0]} radius={radius} pathOptions={opts} />;
  }
  if (shapeType === "rectangle" && draft.length >= 2) {
    const lats = draft.map((p) => p[0]);
    const lngs = draft.map((p) => p[1]);
    return (
      <Rectangle
        bounds={[[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]]}
        pathOptions={opts}
      />
    );
  }
  if (shapeType === "polygon" && draft.length >= 3) return <Polygon positions={draft} pathOptions={opts} />;
  if (draft.length >= 2) return <Polyline positions={draft} pathOptions={{ color, weight: 2, dashArray: "5 4" }} />;
  return null;
}

export default function MarkingMap({
  markings,
  draft,
  draftShape,
  draftColor,
  onAddPoint,
  interactive,
  layer = "tactical",
  focused,
}: {
  markings: Marking[];
  draft: [number, number][];
  draftShape: string;
  draftColor: string;
  onAddPoint?: (p: [number, number]) => void;
  interactive: boolean;
  layer?: string;
  focused?: Marking | null;
}) {
  return (
    <MapContainer
      center={[22.9734, 78.6569]}
      zoom={5}
      className="h-full w-full"
      scrollWheelZoom
      minZoom={4}
      maxBounds={INDIA_BOUNDS}
      maxBoundsViscosity={0.6}
    >
      <MapTiles layer={layer} />
      <IndiaBoundary />
      <MapViewMemory id="marking" />
      <CursorCoords />
      <FocusController marking={focused} />
      {interactive && onAddPoint && <ClickHandler onAdd={onAddPoint} />}

      {markings.map((m) => {
        // Point markers keep their own colour code; zones follow their category.
        const color = m.shapeType === "marker" ? m.color : markingColor(m);
        const isLine = m.shapeType === "line";
        const opts = {
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: isLine ? 0 : 0.18,
          dashArray: m.category === "NO_FLY" ? "6 4" : undefined,
        };
        let shape: ReactNode = null;
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
          <Fragment key={m.id}>
            {shape}
            <MarkingLabels m={m} color={color} />
          </Fragment>
        );
      })}

      {/* Draft being drawn */}
      <DraftPreview shapeType={draftShape} draft={draft} color={draftColor} />
      {draft.map((p, i) => (
        <Marker
          key={i}
          position={p}
          icon={draftShape === "marker" ? markerPinIcon(draftColor) : dot(draftColor)}
        />
      ))}
    </MapContainer>
  );
}
