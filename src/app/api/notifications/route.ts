import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, requireSession, notificationScope } from "@/lib/api";

export const GET = route(async () => {
  const session = await requireSession();

  const canSeePending = session.role === "ADMIN" || session.role === "OPERATOR";

  const [notifications, pendingMissions] = await Promise.all([
    prisma.notification.findMany({
      where: notificationScope(session.sub, session.role),
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    canSeePending
      ? prisma.mission.findMany({
          where: { approvalStatus: "PENDING" },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            missionCode: true,
            missionName: true,
            createdBy: { select: { fullName: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    notifications,
    pendingMissions,
    role: session.role,
    canApprove: session.role === "ADMIN",
  });
});
