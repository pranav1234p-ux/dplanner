"use client";
import dynamic from "next/dynamic";
import type { Waypoint, Shape, Marking } from "@/components/planner/planner-map";

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
  const center: [number, number] =
    waypoints.length > 0 ? [waypoints[0].lat, waypoints[0].lng] : [22.9734, 78.6569];
  return (
    <div className="h-[360px] overflow-hidden rounded-lg border border-white/8">
      <PlannerMap
        layer="tactical"
        waypoints={waypoints}
        shapes={shapes}
        markings={markings}
        center={center}
        zoom={waypoints.length > 0 ? 11 : 5}
        interactive={false}
      />
    </div>
  );
}
