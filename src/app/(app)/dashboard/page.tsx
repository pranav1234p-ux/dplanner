import {
  Plane,
  ListChecks,
  Users,
  Radar,
  Activity,
  PlusCircle,
  CheckCircle2,
  UserPlus,
  RefreshCw,
  LogIn,
} from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard, MiniStat } from "@/components/dashboard/stat-card";
import { StatusPie, CategoryBar } from "@/components/dashboard/charts";
import { DRONE_STATUSES, MISSION_STATUSES } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ACTION_ICON: Record<string, React.ElementType> = {
  DRONE_ADDED: PlusCircle,
  MISSION_CREATED: ListChecks,
  FLIGHT_APPROVED: CheckCircle2,
  USER_REGISTERED: UserPlus,
  USER_APPROVED: CheckCircle2,
  DRONE_STATUS_CHANGED: RefreshCw,
  MISSION_APPROVED: CheckCircle2,
  ADC_GENERATED: CheckCircle2,
  LOGIN: LogIn,
};

async function countBy<T extends string>(
  model: "drone" | "mission" | "user",
  field: string,
  values: readonly T[],
): Promise<Record<T, number>> {
  // @ts-expect-error dynamic model access is safe for our known models
  const rows = await prisma[model].groupBy({ by: [field], _count: { _all: true } });
  const out = Object.fromEntries(values.map((v) => [v, 0])) as Record<T, number>;
  for (const r of rows) {
    const key = r[field] as T;
    if (key in out) out[key] = r._count._all;
  }
  return out;
}

// Viewers only see these activities: new drones, new missions, ADC assignment
// (flight approval), and map markings — plus their OWN sign-in. They never see
// other users' sign-ins, user changes, drone status edits, etc.
const VIEWER_ACTIVITY_ACTIONS = ["DRONE_ADDED", "MISSION_CREATED", "FLIGHT_APPROVED", "MARKING_CREATED"];

export default async function DashboardPage() {
  const session = (await getSession())!;

  let activityWhere: Prisma.AuditLogWhereInput | undefined;
  if (session.role !== "ADMIN") {
    // Operators and viewers never see administrators' activity in their feed.
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    const adminIds = admins.map((a) => a.id);
    const notByAdmin = { OR: [{ userId: null }, { userId: { notIn: adminIds } }] };

    if (session.role === "VIEWER") {
      // Viewers: only new drones / missions / ADC / markings (not by an admin),
      // plus their own sign-in.
      activityWhere = {
        OR: [
          { action: { in: VIEWER_ACTIVITY_ACTIONS }, ...notByAdmin },
          { action: "LOGIN", userId: session.sub },
        ],
      };
    } else {
      // Operators: everything except administrators' activity.
      activityWhere = notByAdmin;
    }
  }

  const [
    droneTotal,
    droneByStatus,
    missionTotal,
    missionByStatus,
    userTotal,
    userByRole,
    dronesByType,
    dronesByUnit,
    recent,
  ] = await Promise.all([
    prisma.drone.count(),
    countBy("drone", "status", DRONE_STATUSES),
    prisma.mission.count(),
    countBy("mission", "missionStatus", MISSION_STATUSES),
    prisma.user.count(),
    countBy("user", "role", ["ADMIN", "OPERATOR", "VIEWER"] as const),
    prisma.drone.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.drone.groupBy({ by: ["unit"], _count: { _all: true } }),
    prisma.auditLog.findMany({ where: activityWhere, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const statusPie = [
    { name: "Active", value: droneByStatus.ACTIVE, color: "#38bdf8" },
    { name: "Standby", value: droneByStatus.STANDBY, color: "#facc15" },
    { name: "Maintenance", value: droneByStatus.MAINTENANCE, color: "#f87171" },
  ];
  const typeBar = dronesByType.map((d) => ({ name: d.type, value: d._count._all }));
  const unitBar = dronesByUnit.map((d) => ({
    name: d.unit.replace(/ (Squadron|Wing|Command|Cell)$/, ""),
    value: d._count._all,
  }));

  return (
    <div>
      <PageHeader
        title="Operations Dashboard"
        subtitle="Live fleet, mission, and personnel status overview"
      />

      <div className="space-y-6 p-6">
        {/* Top-line stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Drones" value={droneTotal} icon={Plane} hint={`${droneByStatus.ACTIVE} active now`} />
          <StatCard label="Total Missions" value={missionTotal} icon={ListChecks} tone="text-sky-400" hint={`${missionByStatus.ACTIVE} in flight`} />
          <StatCard label="Total Users" value={userTotal} icon={Users} tone="text-amber-400" hint={`${userByRole.OPERATOR} operators`} />
          <StatCard label="Fleet Availability" value={`${droneTotal ? Math.round((droneByStatus.ACTIVE / droneTotal) * 100) : 0}%`} icon={Radar} hint="Active / total" />
        </div>

        {/* Summary breakdown row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>
                <Plane className="h-3.5 w-3.5" /> Drone Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <MiniStat label="Active" value={droneByStatus.ACTIVE} dot="bg-sky-400" />
              <MiniStat label="Standby" value={droneByStatus.STANDBY} dot="bg-amber-400" />
              <MiniStat label="Maintenance" value={droneByStatus.MAINTENANCE} dot="bg-red-400" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <ListChecks className="h-3.5 w-3.5" /> Mission Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <MiniStat label="Planned" value={missionByStatus.PLANNED} dot="bg-sky-400" />
              <MiniStat label="Active" value={missionByStatus.ACTIVE} dot="bg-sky-400" />
              <MiniStat label="Completed" value={missionByStatus.COMPLETED} dot="bg-slate-400" />
              <MiniStat label="Expired" value={missionByStatus.EXPIRED} dot="bg-amber-400" />
              <MiniStat label="Cancelled" value={missionByStatus.CANCELLED} dot="bg-red-400" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <Users className="h-3.5 w-3.5" /> User Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <MiniStat label="Administrators" value={userByRole.ADMIN} dot="bg-sky-400" />
              <MiniStat label="Operators" value={userByRole.OPERATOR} dot="bg-sky-400" />
              <MiniStat label="Viewers" value={userByRole.VIEWER} dot="bg-slate-400" />
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Drones by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusPie data={statusPie} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Drones by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryBar data={typeBar} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Drones by Unit</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryBar data={unitBar} />
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Activity className="h-3.5 w-3.5" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-4 border-l border-white/10 pl-6">
              {recent.map((log) => {
                const Icon = ACTION_ICON[log.action] ?? Activity;
                return (
                  <li key={log.id} className="relative">
                    <span className="absolute -left-[31px] grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-navy-850 text-sky-400">
                      <Icon className="h-3 w-3" />
                    </span>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="text-sm text-slate-200">{log.detail}</p>
                      <span className="text-[0.68rem] uppercase tracking-wider text-slate-500">
                        {timeAgo(log.createdAt)}
                      </span>
                    </div>
                    {log.actorName && (
                      <p className="mt-0.5 text-[0.7rem] text-slate-500">by {log.actorName}</p>
                    )}
                  </li>
                );
              })}
              {recent.length === 0 && <li className="text-sm text-slate-500">No recent activity.</li>}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
