import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireSession, notificationScope } from "@/lib/api";

export const POST = route(async () => {
  const session = await requireSession();
  await prisma.notification.updateMany({
    where: { read: false, ...notificationScope(session.sub, session.role) },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
});
