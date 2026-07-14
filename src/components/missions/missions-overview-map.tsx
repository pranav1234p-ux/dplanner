"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import type { Marking } from "@/components/planner/map-config";
import { LayerSwitcher } from "@/components/planner/layer-switcher";

export type OverviewMission = {
  id: string;
  code: string;
  name: string;
  color: string;
  points: [number, number][];
};

const Inner = dynamic(() => import("./missions-overview-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[420px] place-items-center bg-navy-900 text-xs text-slate-500">
      Loading operational map…
    </div>
  ),
});

export function MissionsOverviewMap({
  missions,
  markings,
}: {
  missions: OverviewMission[];
  markings: Marking[];
}) {
  const [layer, setLayer] = React.useState("tactical");
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const plotted = missions.filter((m) => m.points.length > 0);
  const focused = plotted.find((m) => m.id === focusId) ?? null;

  return (
    <div>
      <div className="relative h-[420px] overflow-hidden rounded-lg border border-white/8">
        <Inner missions={missions} markings={markings} layer={layer} focused={focused} />
        <LayerSwitcher layer={layer} onChange={setLayer} className="absolute right-3 top-3 z-[500]" />
        {focused && (
          <button
            onClick={() => setFocusId(null)}
            className="panel absolute left-3 top-3 z-[500] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wider text-slate-300 hover:text-emerald-300"
          >
            Reset view
          </button>
        )}
      </div>
      {/* Legend — click a mission to focus the map on it */}
      <p className="mt-3 mb-1.5 text-[0.66rem] uppercase tracking-wider text-slate-500">
        Click a mission to focus the map · drag / scroll to navigate
      </p>
      <div className="flex flex-wrap gap-1.5">
        {plotted.map((m) => (
          <button
            key={m.id}
            onClick={() => setFocusId(m.id)}
            className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[0.7rem] transition-colors ${
              focusId === m.id
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                : "border-white/10 text-slate-400 hover:bg-white/5"
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
            <span className="font-mono text-slate-300">{m.code}</span>
            <span className="truncate">{m.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
