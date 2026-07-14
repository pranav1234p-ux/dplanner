import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, requireSession, requirePermission, audit } from "@/lib/api";

const waypointSchema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  altitude: z.coerce.number().default(100),
  speed: z.coerce.number().default(10),
  hoverTime: z.coerce.number().default(0),
});

const mapObjectSchema = z.object({
  objectType: z.string(),
  name: z.string(),
  color: z.string().default("#4ade80"),
  notes: z.string().optional().nullable(),
  coordinates: z.any(),
});

const createSchema = z.object({
  missionName: z.string().min(1),
  missionCode: z.string().min(1),
  description: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  droneId: z.string().min(1),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  waypoints: z.array(waypointSchema).default([]),
  mapObjects: z.array(mapObjectSchema).default([]),
});

export const GET = route(async () => {
  await requireSession();
  const missions = await prisma.mission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      drone: true,
      createdBy: { select: { fullName: true } },
      _count: { select: { waypoints: true } },
    },
  });
  return NextResponse.json({ missions });
});

export const POST = route(async (req: Request) => {
  const session = await requirePermission("mission.create");
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const d = parsed.data;

  const dupe = await prisma.mission.findUnique({ where: { missionCode: d.missionCode } });
  if (dupe) return NextResponse.json({ error: "Mission ID already exists" }, { status: 409 });

  // Validate the drone exists, and enforce that operators may only plan missions
  // for drones they added (admins may use any drone).
  const drone = await prisma.drone.findUnique({ where: { id: d.droneId } });
  if (!drone) return NextResponse.json({ error: "Selected drone not found" }, { status: 404 });
  if (session.role === "OPERATOR" && drone.createdById !== session.sub) {
    return NextResponse.json(
      { error: "You can only plan missions for drones you added" },
      { status: 403 },
    );
  }

  const mission = await prisma.mission.create({
    data: {
      missionName: d.missionName,
      missionCode: d.missionCode,
      description: d.description,
      unit: d.unit,
      droneId: d.droneId,
      notes: d.notes,
      startTime: d.startTime ? new Date(d.startTime) : null,
      endTime: d.endTime ? new Date(d.endTime) : null,
      missionStatus: "PLANNED",
      approvalStatus: "PENDING",
      createdById: session.sub,
      waypoints: {
        create: d.waypoints.map((w, i) => ({
          sequence: i + 1,
          latitude: w.latitude,
          longitude: w.longitude,
          altitude: w.altitude,
          speed: w.speed,
          hoverTime: w.hoverTime,
        })),
      },
      mapObjects: {
        create: d.mapObjects.map((o) => ({
          objectType: o.objectType,
          name: o.name,
          color: o.color,
          notes: o.notes ?? null,
          coordinates: JSON.stringify(o.coordinates),
        })),
      },
    },
  });

  await audit({
    action: "MISSION_CREATED",
    detail: `${mission.missionName} (${mission.missionCode}) created with ${d.waypoints.length} waypoints.`,
    session,
    notify: { title: "Mission Created", message: `${mission.missionCode} saved as Planned.`, type: "INFO" },
  });

  return NextResponse.json({ mission }, { status: 201 });
});
