"use client";
import { useState } from "react";
import { useMapEvents } from "react-leaflet";

/** Live lat/long readout for whatever the cursor is over. Renders as a bar across
 *  the top of the map — must be used inside a MapContainer. */
export function CursorCoords() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);

  useMapEvents({
    mousemove: (e) => setPos({ lat: e.latlng.lat, lng: e.latlng.lng }),
    mouseout: () => setPos(null),
  });

  if (!pos) return null;

  return (
    // Centred and dropped below the layer switcher / zoom controls so it clears them
    // at any map width. pointer-events-none so it never swallows a click meant for
    // the map (the planner drops waypoints on click).
    <div className="pointer-events-none absolute left-1/2 top-12 z-[650] -translate-x-1/2">
      <div className="panel flex items-center gap-3 px-2.5 py-1 font-mono text-[0.68rem] text-slate-300">
        <span>
          <span className="text-slate-500">LAT </span>
          {Math.abs(pos.lat).toFixed(5)}°{pos.lat >= 0 ? "N" : "S"}
        </span>
        <span>
          <span className="text-slate-500">LNG </span>
          {Math.abs(pos.lng).toFixed(5)}°{pos.lng >= 0 ? "E" : "W"}
        </span>
      </div>
    </div>
  );
}
