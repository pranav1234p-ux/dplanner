"use client";
import { TileLayer } from "react-leaflet";
import { MAP_LAYERS } from "./map-config";

/** Renders the base tile layer for a given layer key, plus an English label
 *  overlay for imagery layers (e.g. satellite). Must be used inside a MapContainer. */
export function MapTiles({ layer }: { layer: string }) {
  const tl = MAP_LAYERS[layer] ?? MAP_LAYERS.tactical;
  return (
    <>
      <TileLayer key={`base-${layer}`} url={tl.url} attribution={tl.attribution} />
      {tl.reference && <TileLayer key={`ref-${layer}`} url={tl.reference} />}
    </>
  );
}
