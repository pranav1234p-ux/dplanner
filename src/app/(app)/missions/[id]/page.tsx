import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plane, User, Clock, Hash, FileText, CalendarClock, Timer } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MissionStatusBadge, ApprovalBadge } from "@/components/ui/badge";
import { MissionMapPreview } from "@/components/missions/mission-map-preview";
import { MissionActions } from "@/components/missions/mission-actions";
import { formatDateTime, formatDuration } from "@/lib/utils";
import type { Shape } from "@/components/planner/planner-map";

export const dynamic = "force-dynamic";

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
      <div className="min-w-0">
        <p className="text-[0.68rem] uppercase tracking-wider text-slate-500">{label}</p>
        <div className="text-sm text-slate-200">{value}</div>
      </div>
    </div>
  );
}

export default async function MissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await getSession())!;

  const mission = await prisma.mission.findUnique({
    where: { id },
    include: {
      drone: true,
      createdBy: { select: { fullName: true, rank: true, unit: true } },
      approvedBy: { select: { fullName: true } },
      waypoints: { orderBy: { sequence: "asc" } },
      mapObjects: true,
    },
  });
  if (!mission) notFound();

  const markingRows = await prisma.mapMarking.findMany({
    include: { createdBy: { select: { fullName: true } } },
  });
  const markings = markingRows.map((m) => ({
    id: m.id,
    name: m.name,
    shapeType: m.shapeType,
    category: m.category,
    color: m.color,
    coordinates: JSON.parse(m.coordinates) as number[][],
    createdByName: m.createdBy?.fullName ?? null,
  }));

  const waypoints = mission.waypoints.map((w) => ({
    sequence: w.sequence,
    lat: w.latitude,
    lng: w.longitude,
    latitude: w.latitude,
    longitude: w.longitude,
    altitude: w.altitude,
    speed: w.speed,
    hoverTime: w.hoverTime,
  }));

  const shapes: Shape[] = mission.mapObjects.map((o) => ({
    objectType: o.objectType,
    name: o.name,
    color: o.color,
    coordinates: JSON.parse(o.coordinates),
  }));

  return (
    <div>
      <PageHeader title={mission.missionName} subtitle={`Mission ${mission.missionCode}`}>
        <Link href="/missions">
          <span className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Missions
          </span>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
        {/* Left: main content */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Flight Path Preview</CardTitle>
              <div className="flex gap-2">
                <MissionStatusBadge status={mission.missionStatus} />
                <ApprovalBadge status={mission.approvalStatus} />
              </div>
            </CardHeader>
            <CardContent>
              <MissionMapPreview waypoints={waypoints} shapes={shapes} markings={markings} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle><CalendarClock className="h-3.5 w-3.5" /> Flight Schedule</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/8 bg-navy-950/40 p-3">
                <p className="flex items-center gap-1.5 text-[0.68rem] uppercase tracking-wider text-slate-500">
                  <Clock className="h-3 w-3 text-sky-400" /> Takeoff
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{formatDateTime(mission.startTime)}</p>
              </div>
              <div className="rounded-lg border border-white/8 bg-navy-950/40 p-3">
                <p className="flex items-center gap-1.5 text-[0.68rem] uppercase tracking-wider text-slate-500">
                  <Clock className="h-3 w-3 text-sky-400" /> Landing
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{formatDateTime(mission.endTime)}</p>
              </div>
              <div className="rounded-lg border border-white/8 bg-navy-950/40 p-3">
                <p className="flex items-center gap-1.5 text-[0.68rem] uppercase tracking-wider text-slate-500">
                  <Timer className="h-3 w-3 text-amber-400" /> Duration
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{formatDuration(mission.startTime, mission.endTime)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Waypoints ({waypoints.length})</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-left text-[0.68rem] uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2.5">#</th>
                    <th className="px-4 py-2.5">Latitude</th>
                    <th className="px-4 py-2.5">Longitude</th>
                    <th className="px-4 py-2.5">Altitude</th>
                    <th className="px-4 py-2.5">Speed</th>
                    <th className="px-4 py-2.5">Hover</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {waypoints.map((w) => (
                    <tr key={w.sequence} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-2.5 text-sky-300">{w.sequence}</td>
                      <td className="px-4 py-2.5 text-slate-300">{w.latitude.toFixed(5)}</td>
                      <td className="px-4 py-2.5 text-slate-300">{w.longitude.toFixed(5)}</td>
                      <td className="px-4 py-2.5 text-slate-300">{w.altitude} m</td>
                      <td className="px-4 py-2.5 text-slate-300">{w.speed} m/s</td>
                      <td className="px-4 py-2.5 text-slate-300">{w.hoverTime} s</td>
                    </tr>
                  ))}
                  {waypoints.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No waypoints recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {mission.notes && (
            <Card>
              <CardHeader><CardTitle><FileText className="h-3.5 w-3.5" /> Mission Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm leading-relaxed text-slate-300">{mission.notes}</p></CardContent>
            </Card>
          )}
        </div>

        {/* Right: info + actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Mission Information</CardTitle></CardHeader>
            <CardContent className="divide-y divide-white/5 py-0">
              <InfoRow icon={Hash} label="ADC Number" value={mission.adcNumber ? <span className="font-mono text-sky-300">{mission.adcNumber}</span> : <span className="text-slate-500">Not assigned</span>} />
              <InfoRow icon={Plane} label="Drone" value={`${mission.drone.name} (${mission.drone.droneId})`} />
              <InfoRow icon={User} label="Created By" value={`${mission.createdBy.rank ?? ""} ${mission.createdBy.fullName}`.trim()} />
              {mission.description && <InfoRow icon={FileText} label="Description" value={mission.description} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Drone Information</CardTitle></CardHeader>
            <CardContent className="divide-y divide-white/5 py-0">
              <InfoRow icon={Plane} label="Type" value={mission.drone.type} />
              <InfoRow icon={Hash} label="Frequency" value={mission.drone.frequency} />
              <InfoRow icon={User} label="Unit" value={mission.drone.unit} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent>
              <MissionActions
                missionId={mission.id}
                missionCode={mission.missionCode}
                missionName={mission.missionName}
                approvalStatus={mission.approvalStatus}
                missionStatus={mission.missionStatus}
                waypoints={mission.waypoints}
                canApprove={can(session.role, "mission.approve")}
                canStatus={
                  can(session.role, "mission.status") ||
                  (session.role === "OPERATOR" && mission.createdById === session.sub)
                }
                canDelete={session.role === "ADMIN"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Approval History</CardTitle></CardHeader>
            <CardContent>
              <ol className="relative space-y-3 border-l border-white/10 pl-5 text-sm">
                <li className="relative">
                  <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full bg-sky-400" />
                  <p className="text-slate-200">Mission created</p>
                  <p className="text-[0.7rem] text-slate-500">{mission.createdBy.fullName} · {formatDateTime(mission.createdAt)}</p>
                </li>
                {mission.approvedAt && (
                  <li className="relative">
                    <span className={`absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full ${mission.approvalStatus === "APPROVED" ? "bg-sky-400" : "bg-red-400"}`} />
                    <p className="text-slate-200">Flight plan {mission.approvalStatus.toLowerCase()}</p>
                    <p className="text-[0.7rem] text-slate-500">{mission.approvedBy?.fullName ?? "—"} · {formatDateTime(mission.approvedAt)}</p>
                  </li>
                )}
                {mission.approvalStatus === "PENDING" && (
                  <li className="relative">
                    <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <p className="text-slate-400">Awaiting administrator approval</p>
                  </li>
                )}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
