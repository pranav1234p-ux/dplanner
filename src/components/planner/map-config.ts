// Leaflet-free map configuration and shared types.
// IMPORTANT: this module must NOT import "leaflet" — it is imported by client
// components that are server-rendered, and Leaflet touches `window` at import time.

export type LatLng = { lat: number; lng: number };
export type Waypoint = LatLng & { altitude: number; speed: number; hoverTime: number };
export type Shape = {
  objectType: string;
  name: string;
  color: string;
  coordinates: number[][];
};
// Standalone map markings (no-fly / restricted / custom shapes).
export type Marking = {
  id: string;
  name: string;
  shapeType: string; // line | circle | rectangle | polygon
  category: string; // NO_FLY | RESTRICTED | CUSTOM
  color: string;
  // circle: [[lat,lng,radius]] · rectangle: [[lat,lng],[lat,lng]] · line/polygon: [[lat,lng], ...]
  coordinates: number[][];
  createdByName?: string | null; // who drew the marking (shown on the map)
};

/** Resolve the effective display color for a marking (category overrides custom color). */
export function markingColor(m: { category: string; color: string }): string {
  if (m.category === "NO_FLY") return "#ef4444";
  if (m.category === "RESTRICTED") return "#f59e0b";
  return m.color;
}

export const MAP_LAYERS: Record<
  string,
  { name: string; url: string; attribution: string; reference?: string }
> = {
  tactical: {
    name: "Tactical",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    // Light-text English label overlay (for dark bases) so neighbouring countries
    // (Pakistan, China, Nepal, Bangladesh…) are labelled in English too.
    reference:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places_Alternate/MapServer/tile/{z}/{y}/{x}",
  },
  street: {
    name: "Street",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    reference:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
    // English place-name + boundary labels overlaid on the imagery (Latin script).
    reference:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  },
  terrain: {
    name: "Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenTopoMap (CC-BY-SA)",
    reference:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  },
};
