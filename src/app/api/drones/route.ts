import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, requireSession, requirePermission, audit } from "@/lib/api";
import { DRONE_STATUSES } from "@/lib/constants";

const createSchema = z.object({
  droneId: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  frequency: z.string().min(1),
  unit: z.string().min(1),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  status: z.enum(DRONE_STATUSES).default("STANDBY"),
});

export const GET = route(async () => {
  await requireSession();
  const drones = await prisma.drone.findMany({ orderBy: { droneId: "asc" } });
  return NextResponse.json({ drones });
});

export const POST = route(async (req: Request) => {
  const session = await requirePermission("drone.create");
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const existing = await prisma.drone.findUnique({ where: { droneId: parsed.data.droneId } });
  if (existing) return NextResponse.json({ error: "Drone ID already exists" }, { status: 409 });

  const drone = await prisma.drone.create({ data: { ...parsed.data, createdById: session.sub } });
  await audit({
    action: "DRONE_ADDED",
    detail: `${drone.name} (${drone.droneId}) added to fleet.`,
    session,
    notify: { title: "Drone Added", message: `${drone.name} added to the fleet.`, type: "INFO" },
  });
  return NextResponse.json({ drone }, { status: 201 });
});
