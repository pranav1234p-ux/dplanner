"use client";
import * as React from "react";
import { MAP_LAYERS } from "@/components/planner/map-config";

// Remembers where each map surface (planner, marking, missions overview) was left:
// centre, zoom, and base layer. Kept in sessionStorage so it survives moving between
// tabs and reloads, and is scoped to the browser tab rather than shared machine-wide.
//
// NOTE: must stay free of any "leaflet" import — the SSR'd tab components call
// useStickyMapLayer, and Leaflet touches `window` at import time.

export type MapView = { lat: number; lng: number; zoom: number; layer: string };

const storageKey = (id: string) => `dcc:map-view:${id}`;

export function loadMapView(id: string): Partial<MapView> | null {
  try {
    const raw = sessionStorage.getItem(storageKey(id));
    return raw ? (JSON.parse(raw) as Partial<MapView>) : null;
  } catch {
    return null;
  }
}

export function saveMapView(id: string, patch: Partial<MapView>) {
  try {
    sessionStorage.setItem(storageKey(id), JSON.stringify({ ...loadMapView(id), ...patch }));
  } catch {
    // Storage unavailable or full — remembering the view is best-effort.
  }
}

/** The base-layer choice for a map surface, restored when the user returns to the tab.
 *  Restored in an effect rather than in the initial state so the server and the first
 *  client render agree. */
export function useStickyMapLayer(id: string, fallback = "tactical") {
  const [layer, setLayer] = React.useState(fallback);

  React.useEffect(() => {
    const saved = loadMapView(id)?.layer;
    if (saved && saved in MAP_LAYERS) setLayer(saved);
  }, [id]);

  const choose = React.useCallback(
    (next: string) => {
      setLayer(next);
      saveMapView(id, { layer: next });
    },
    [id],
  );

  return [layer, choose] as const;
}
