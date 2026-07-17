"use client";
import { useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import { loadMapView, saveMapView } from "@/lib/map-view";

/** Restores the centre/zoom this map surface was last left at, then records every
 *  pan and zoom. Must be rendered inside a MapContainer. */
export function MapViewMemory({ id }: { id: string }) {
  const map = useMap();
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const v = loadMapView(id);
    if (typeof v?.lat === "number" && typeof v.lng === "number" && typeof v.zoom === "number") {
      map.setView([v.lat, v.lng], v.zoom, { animate: false });
    }
  }, [id, map]);

  // Leaflet fires moveend for zooms too, so this covers both.
  useMapEvents({
    moveend: (e) => {
      const c = e.target.getCenter();
      saveMapView(id, { lat: c.lat, lng: c.lng, zoom: e.target.getZoom() });
    },
  });

  return null;
}
