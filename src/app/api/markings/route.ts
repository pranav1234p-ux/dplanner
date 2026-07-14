import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, requireSession, requirePermission, audit } from "@/lib/api";
import { MARKING_SHAPES, MARKING_CATEGORIES } from "@/lib/constants";

export const GET = route(async () => {
  await requireSession();
  const markings = await prisma.mapMarking.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { fullName: true } } },
  });
  return NextResponse.json({ markings });
});

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  shapeType: z.enum(MARKING_SHAPES),
  category: z.enum(MARKING_CATEGORIES).default("CUSTOM"),
  color: z.string().default("#38bdf8"),
  notes: z.string().optional().nullable(),
  coordinates: z.array(z.array(z.number())).min(1, "At least one point is required"),
});

export const POST = route(async (req: Request) => {
  const session = await requirePermission("marking.create");
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const d = parsed.data;

  // Minimum vertex sanity per shape.
  const need =
    d.shapeType === "polygon" ? 3 : d.shapeType === "line" || d.shapeType === "rectangle" ? 2 : 1;
  if (d.coordinates.length < need) {
    return NextResponse.json({ error: `A ${d.shapeType} needs at least ${need} point(s)` }, { status: 400 });
  }

  const marking = await prisma.mapMarking.create({
    data: {
      name: d.name,
      shapeType: d.shapeType,
      category: d.category,
      color: d.color,
      notes: d.notes ?? null,
      coordinates: JSON.stringify(d.coordinates),
      createdById: session.sub,
    },
  });

  await audit({
    action: "MARKING_CREATED",
    detail: `Map marking "${marking.name}" (${marking.category}) created.`,
    session,
    notify: {
      title: "Map Marking Added",
      message: `${marking.name} added as ${marking.category.replace("_", "-")}.`,
      type: marking.category === "NO_FLY" ? "WARNING" : "INFO",
    },
  });

  return NextResponse.json({ marking }, { status: 201 });
});
