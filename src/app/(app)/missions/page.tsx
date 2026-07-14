import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { MISSION_COLORS } from "@/lib/constants";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MissionList, type MissionRow } from "@/components/missions/mission-list";
import { MissionsOverviewMap, type OverviewMission } from "@/components/missions/missions-overview-map";
import type { Marking } from "@/components/planner/planner-map";

export const dynamic = "force-dynamic";

export default async function MissionsPage() {
  const session = (await getSession())!;
  const [missions, markingRows] = await Promise.all([
    prisma.mission.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        drone: { select: { name: true } },
        createdBy: { select: { fullName: true } },
        waypoints: { orderBy: { sequence: "asc" }, select: { latitude: true, longitude: true } },
        _count: { select: { waypoints: true } },
      },
    }),
    prisma.mapMarking.findMany({ include: { createdBy: { select: { fullName: true } } } }),
  ]);

  const rows: MissionRow[] = missions.map((m) => ({
    id: m.id,
    missionName: m.missionName,
    missionCode: m.missionCode,
    unit: m.unit,
    missionStatus: m.missionStatus,
    approvalStatus: m.approvalStatus,
    adcNumber: m.adcNumber,
    droneName: m.drone.name,
    createdBy: m.createdBy.fullName,
    waypointCount: m._count.waypoints,
    startTime: m.startTime ? m.startTime.toISOString() : null,
  }));

  // Each mission gets a distinct colour for its waypoints on the overview map.
  const overview: OverviewMission[] = missions.map((m, i) => ({
    id: m.id,
    code: m.missionCode,
    name: m.missionName,
    color: MISSION_COLORS[i % MISSION_COLORS.length],
    points: m.waypoints.map((w) => [w.latitude, w.longitude] as [number, number]),
  }));

  const markings: Marking[] = markingRows.map((m) => ({
    id: m.id,
    name: m.name,
    shapeType: m.shapeType,
    category: m.category,
    color: m.color,
    coordinates: JSON.parse(m.coordinates) as number[][],
    createdByName: m.createdBy?.fullName ?? null,
  }));

  const hasPlotted = overview.some((m) => m.points.length > 0);

  return (
    <div>
      <PageHeader title="Missions" subtitle={`${rows.length} mission records`} />
      <div className="space-y-6 p-6">
        {(hasPlotted || markings.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Operational Map — All Missions &amp; Markings</CardTitle>
            </CardHeader>
            <CardContent>
              <MissionsOverviewMap missions={overview} markings={markings} />
            </CardContent>
          </Card>
        )}

        <Suspense fallback={null}>
          <MissionList missions={rows} canCreate={can(session.role, "mission.create")} />
        </Suspense>
      </div>
    </div>
  );
}
