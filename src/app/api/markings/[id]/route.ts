import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireSession, audit, ApiError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export const DELETE = route(async (_req: Request, { params }: Params) => {
  const session = await requireSession();
  const { id } = await params;
  const marking = await prisma.mapMarking.findUnique({ where: { id } });
  if (!marking) throw new ApiError(404, "Marking not found");

  // Admins may delete any marking; operators only ones they created.
  const isOwner = marking.createdById === session.sub;
  if (session.role !== "ADMIN" && !(session.role === "OPERATOR" && isOwner)) {
    throw new ApiError(403, "You can only delete markings you created");
  }

  await prisma.mapMarking.delete({ where: { id } });
  await audit({ action: "MARKING_DELETED", detail: `Map marking "${marking.name}" removed.`, session });
  return NextResponse.json({ ok: true });
});
