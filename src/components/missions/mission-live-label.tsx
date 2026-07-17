"use client";
import L from "leaflet";
import { Marker } from "react-leaflet";
import { useVisibleWidthKm } from "@/components/marking/marking-labels";

// Only when the visible map area is roughly 75×75 km or tighter — otherwise the
// label clutters the country-scale overview. The flight path itself keeps
// blinking at every zoom; only this text label is gated.
const LABEL_SPAN_KM = 75;

// Same dark halo trick as marking labels, so the (bright, mission-coloured) text
// stays readable over tactical/street/satellite/terrain alike. Static — not the
// blinking path's animation — so it stays legible while the line pulses.
const HALO =
  "text-shadow:0 0 3px #000,0 0 4px #000,1px 1px 1px #000,-1px -1px 1px #000,1px -1px 1px #000,-1px 1px 1px #000;";

const liveIcon = (color: string, code: string, droneName: string, unit: string | null) =>
  L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-100%);white-space:nowrap;text-align:center;line-height:1.25;${HALO}">
      <div style="font-size:12.5px;font-weight:800;color:${color}">${code}</div>
      <div style="font-size:10.5px;font-weight:700;color:${color}">${droneName}${unit ? ` &middot; ${unit}` : ""}</div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

/** Static label above a live (approved + active) mission's path: MSN code, drone
 *  name, and unit, in the mission's own colour. Only shown once zoomed to a
 *  ~75×75 km area — the path itself keeps blinking regardless of zoom. */
export function MissionLiveLabel({
  position,
  color,
  code,
  droneName,
  unit,
}: {
  position: [number, number];
  color: string;
  code: string;
  droneName: string;
  unit: string | null;
}) {
  const widthKm = useVisibleWidthKm();
  if (widthKm > LABEL_SPAN_KM) return null;
  return <Marker position={position} icon={liveIcon(color, code, droneName, unit)} interactive={false} />;
}
