"use client";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAP_LAYERS } from "./map-config";

/** Tactical / Street / Satellite / Terrain layer selector. Plain DOM overlay
 *  (no Leaflet import) so it can be positioned over any map container. */
export function LayerSwitcher({
  layer,
  onChange,
  className,
}: {
  layer: string;
  onChange: (l: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("panel flex items-center gap-1 p-1", className)}>
      <Layers className="ml-1 h-3.5 w-3.5 text-slate-400" />
      {Object.entries(MAP_LAYERS).map(([key, l]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "rounded px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-wider transition-colors",
            layer === key ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:text-slate-200",
          )}
        >
          {l.name}
        </button>
      ))}
    </div>
  );
}
