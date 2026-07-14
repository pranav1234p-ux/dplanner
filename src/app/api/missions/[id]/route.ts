import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, requireSession, requirePermission, audit, ApiError } from "@/lib/api";
import { MISSION_STATUSES } from "@/lib/constants";
import { canEdit } from "@/lib/rbac";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, { params }: Params) => {
  await requireSession();
  const { id } = await params;
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
  if (!mission) throw new ApiError(404, "Mission not found");
  return NextResponse.json({ mission });
});

const patchSchema = z.object({
  missionStatus: z.enum(MISSION_STATUSES).optional(),
  notes: z.string().optional(),
});

export const PATCH = route(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  // Admins can change any mission's status; operators can change the status of
  // missions they created (like admin does, but scoped to their own).
  const session = await requireSession();
  const before = await prisma.mission.findUnique({ where: { id } });
  if (!before) throw new ApiError(404, "Mission not found");

  const isOwner = before.createdById === session.sub;
  if (session.role !== "ADMIN" && !(session.role === "OPERATOR" && isOwner)) {
    throw new ApiError(403, "You can only change the status of missions you created");
  }

  const mission = await prisma.mission.update({ where: { id }, data: parsed.data });

  if (parsed.data.missionStatus && parsed.data.missionStatus !== before.missionStatus) {
    await audit({
      action: "MISSION_STATUS_CHANGED",
      detail: `${mission.missionCode} status → ${mission.missionStatus}.`,
      session,
      notify: {
        title: "Mission Status Changed",
        message: `${mission.missionCode} is now ${mission.missionStatus}.`,
        type: mission.missionStatus === "COMPLETED" ? "SUCCESS" : "INFO",
      },
    });
  }
  return NextResponse.json({ mission });
});

export const DELETE = route(async (_req: Request, { params }: Params) => {
  const { id } = await params;
  const session = await requireSession();
  const mission = await prisma.mission.findUnique({ where: { id } });
  if (!mission) throw new ApiError(404, "Mission not found");

  // Admins can delete any mission; operators only their own unapproved missions.
  const isOwnerDraft =
    mission.createdById === session.sub && mission.approvalStatus === "PENDING";
  if (session.role !== "ADMIN" && !(canEdit(session.role) && isOwnerDraft)) {
    throw new ApiError(403, "You cannot delete this mission");
  }

  await prisma.mission.delete({ where: { id } });
  await audit({ action: "MISSION_DELETED", detail: `${mission.missionCode} deleted.`, session });
  return NextResponse.json({ ok: true });
});
