"use client";
import { Fragment, useEffect, type ReactNode } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Polygon, Circle, Rectangle, CircleMarker, Tooltip, useMap } from "react-leaflet";
import { IndiaBoundary } from "@/components/planner/india-boundary";
import { MapTiles } from "@/components/planner/map-tiles";
import { MarkingLabels } from "@/components/marking/marking-labels";
import { markerPinIcon } from "@/components/marking/marker-icon";
import { markingColor, type Marking } from "@/components/planner/map-config";
import type { OverviewMission } from "./missions-overview-map";

/** Centres the map on the selected mission showing a ~150×150 km area. The map
 *  stays fully navigable afterwards (free zoom in/out). */
function FocusController({ mission }: { mission?: OverviewMission | null }) {
  const map = useMap();
  useEffect(() => {
    if (mission && mission.points.length) {
      const c = L.latLngBounds(mission.points).getCenter();
      // Centre on the mission at a zoom that shows roughly a 150×150 km area.
      map.setView(c, 9, { animate: true });
    }
  }, [mission, map]);
  return null;
}

export default function MissionsOverviewMapInner({
  missions,
  markings,
  layer = "tactical",
  focused,
}: {
  missions: OverviewMission[];
  markings: Marking[];
  layer?: string;
  focused?: OverviewMission | null;
}) {
  return (
    <MapContainer
      center={[22.9734, 78.6569]}
      zoom={5}
      className="h-full w-full"
      scrollWheelZoom
      minZoom={3}
    >
      <MapTiles layer={layer} />
      <IndiaBoundary />
      <FocusController mission={focused} />

      {/* Map markings with labels */}
      {markings.map((m) => {
        const color = m.shapeType === "marker" ? m.color : markingColor(m);
        const isLine = m.shapeType === "line";
        const opts = {
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: isLine ? 0 : 0.12,
          dashArray: m.category === "NO_FLY" ? "6 4" : undefined,
        };
        let shape: ReactNode = null;
        if (m.shapeType === "marker" && m.coordinates.length >= 1) {
          shape = <Marker position={m.coordinates[0] as [number, number]} icon={markerPinIcon(m.color)} />;
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

      {/* Each mission's waypoints + path, colour-coded per mission */}
      {missions.map((m) =>
        m.points.length === 0 ? null : (
          <Fragment key={m.id}>
            {m.points.length > 1 && (
              <Polyline
                positions={m.points}
                pathOptions={{ color: m.color, weight: focused?.id === m.id ? 4 : 2.5, opacity: 0.9 }}
              />
            )}
            {m.points.map((p, i) => (
              <CircleMarker
                key={i}
                center={p}
                radius={focused?.id === m.id ? 7 : 5}
                pathOptions={{ color: "#05070d", weight: 1.5, fillColor: m.color, fillOpacity: 1 }}
              >
                <Tooltip>{`${m.code} · WP ${i + 1}`}</Tooltip>
              </CircleMarker>
            ))}
          </Fragment>
        ),
      )}
    </MapContainer>
  );
}
