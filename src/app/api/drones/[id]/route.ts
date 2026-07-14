import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, requirePermission, requireSession, audit, ApiError } from "@/lib/api";
import { DRONE_STATUSES } from "@/lib/constants";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  frequency: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  status: z.enum(DRONE_STATUSES).optional(),
});

type Params = { params: Promise<{ id: string }> };

export const PATCH = route(async (req: Request, { params }: Params) => {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const data = parsed.data;
  const keys = Object.keys(data);
  const statusOnly = keys.length === 1 && keys[0] === "status";

  // Operators may only change status; full edits require drone.edit (admin).
  const session = statusOnly
    ? await requirePermission("drone.status")
    : await requirePermission("drone.edit");

  const before = await prisma.drone.findUnique({ where: { id } });
  if (!before) throw new ApiError(404, "Drone not found");

  const drone = await prisma.drone.update({ where: { id }, data });

  if (statusOnly && before.status !== drone.status) {
    await audit({
      action: "DRONE_STATUS_CHANGED",
      detail: `${drone.name} → ${drone.status}.`,
      session,
      notify: { title: "Drone Status Changed", message: `${drone.name} is now ${drone.status}.`, type: "WARNING" },
    });
  } else {
    await audit({ action: "DRONE_EDITED", detail: `${drone.name} (${drone.droneId}) details updated.`, session });
  }
  return NextResponse.json({ drone });
});

export const DELETE = route(async (_req: Request, { params }: Params) => {
  const { id } = await params;
  const session = await requireSession();
  const drone = await prisma.drone.findUnique({ where: { id }, include: { missions: true } });
  if (!drone) throw new ApiError(404, "Drone not found");

  // Admins may delete any drone; operators may delete only drones they created.
  const isOwner = drone.createdById === session.sub;
  if (session.role !== "ADMIN" && !(session.role === "OPERATOR" && isOwner)) {
    throw new ApiError(403, "You can only delete drones you created");
  }
  if (drone.missions.length > 0) {
    throw new ApiError(409, "Cannot delete a drone assigned to missions");
  }
  await prisma.drone.delete({ where: { id } });
  await audit({
    action: "DRONE_DELETED",
    detail: `${drone.name} (${drone.droneId}) removed from fleet.`,
    session,
    notify: { title: "Drone Removed", message: `${drone.name} was removed from the fleet.`, type: "WARNING" },
  });
  return NextResponse.json({ ok: true });
});
