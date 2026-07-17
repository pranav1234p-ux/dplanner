"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import type { Marking } from "@/components/planner/map-config";
import { LayerSwitcher } from "@/components/planner/layer-switcher";
import { Select } from "@/components/ui/input";
import { useStickyMapLayer } from "@/lib/map-view";

export type OverviewMission = {
  id: string;
  code: string;
  name: string;
  color: string;
  points: [number, number][];
  missionStatus: string;
  approvalStatus: string;
  droneName: string;
  unit: string | null;
  /** Approved and under way — the mission path blinks on the map. */
  live: boolean;
};

// Map filters. Pending/Approved read the approval state, Active/Completed the
// mission state, so a mission can legitimately answer to more than one of them.
const FILTERS: { key: string; label: string; match: (m: OverviewMission) => boolean }[] = [
  { key: "ALL", label: "All missions", match: () => true },
  { key: "PENDING", label: "Pending", match: (m) => m.approvalStatus === "PENDING" },
  { key: "ACTIVE", label: "Active", match: (m) => m.missionStatus === "ACTIVE" },
  { key: "APPROVED", label: "Approved", match: (m) => m.approvalStatus === "APPROVED" },
  { key: "COMPLETED", label: "Completed", match: (m) => m.missionStatus === "COMPLETED" },
];

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
  const [layer, setLayer] = useStickyMapLayer("missions");
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const [filterKey, setFilterKey] = React.useState("ALL");

  const filter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0];
  // Counts cover every mission on the page; the map can only draw the ones that
  // actually have waypoints.
  const counts = React.useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, missions.filter(f.match).length])),
    [missions],
  );

  const shown = missions.filter(filter.match);
  const plotted = shown.filter((m) => m.points.length > 0);
  const focused = plotted.find((m) => m.id === focusId) ?? null;
  const hiddenCount = shown.length - plotted.length;

  return (
    <div>
      <div className="relative h-[420px] overflow-hidden rounded-lg border border-white/8">
        <Inner missions={plotted} markings={markings} layer={layer} focused={focused} />
        <LayerSwitcher layer={layer} onChange={setLayer} className="absolute right-3 top-3 z-[500]" />
        {focused && (
          <button
            onClick={() => setFocusId(null)}
            className="panel absolute left-3 top-3 z-[500] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wider text-slate-300 hover:text-sky-300"
          >
            Reset view
          </button>
        )}
      </div>
      {/* Status filter — each option carries its own total */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Select
          value={filterKey}
          onChange={(e) => {
            setFilterKey(e.target.value);
            setFocusId(null);
          }}
          aria-label="Filter missions on the map by status"
          className="h-9 w-auto min-w-[13rem] text-xs"
        >
          {FILTERS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label} ({counts[f.key]})
            </option>
          ))}
        </Select>
        <span className="text-[0.66rem] uppercase tracking-wider text-slate-500">
          {plotted.length} on map
          {hiddenCount > 0 && ` · ${hiddenCount} without waypoints`}
        </span>
      </div>

      {/* Legend — click a mission to focus the map on it */}
      <p className="mt-3 mb-1.5 text-[0.66rem] uppercase tracking-wider text-slate-500">
        Click a mission to focus the map · drag / scroll to navigate
      </p>
      <div className="flex flex-wrap gap-1.5">
        {plotted.length === 0 && (
          <p className="text-xs text-slate-500">No missions with a plotted route match this filter.</p>
        )}
        {plotted.map((m) => (
          <button
            key={m.id}
            onClick={() => setFocusId(m.id)}
            className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[0.7rem] transition-colors ${
              focusId === m.id
                ? "border-sky-500/50 bg-sky-500/10 text-sky-200"
                : "border-white/10 text-slate-400 hover:bg-white/5"
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
            <span className="font-mono text-slate-300">{m.code}</span>
            <span className="truncate">{m.name}</span>
            <span className="text-slate-500">·</span>
            <span className="truncate text-slate-400">{m.droneName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
