"use client";
import dynamic from "next/dynamic";
import type { Waypoint, Shape, Marking } from "@/components/planner/planner-map";
import type { MAP_LAYERS } from "@/components/planner/map-config";
import { LayerSwitcher } from "@/components/planner/layer-switcher";
import { useStickyMapLayer } from "@/lib/map-view";

const PlannerMap = dynamic(() => import("@/components/planner/planner-map"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center bg-navy-900 text-xs text-slate-500">Loading map…</div>,
});

export function MissionMapPreview({
  waypoints,
  shapes,
  markings,
}: {
  waypoints: Waypoint[];
  shapes: Shape[];
  markings: Marking[];
}) {
  // The base layer follows the user between tabs, but the view is not remembered:
  // each mission's map should open framed on its own flight path.
  const [layer, setLayer] = useStickyMapLayer("mission-detail");

  const center: [number, number] =
    waypoints.length > 0 ? [waypoints[0].lat, waypoints[0].lng] : [22.9734, 78.6569];
  return (
    <div className="relative h-[360px] overflow-hidden rounded-lg border border-white/8">
      <PlannerMap
        layer={layer as keyof typeof MAP_LAYERS}
        waypoints={waypoints}
        shapes={shapes}
        markings={markings}
        center={center}
        zoom={waypoints.length > 0 ? 11 : 5}
        interactive
      />
      <LayerSwitcher layer={layer} onChange={setLayer} className="absolute right-3 top-3 z-[500]" />
    </div>
  );
}
