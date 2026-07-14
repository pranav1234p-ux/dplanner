import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { MarkingManager } from "@/components/marking/marking-manager";

export const dynamic = "force-dynamic";

export default async function MapMarkingPage() {
  const session = (await getSession())!;
  const rows = await prisma.mapMarking.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { fullName: true } } },
  });
  const markings = rows.map((m) => ({
    id: m.id,
    name: m.name,
    shapeType: m.shapeType,
    category: m.category,
    color: m.color,
    coordinates: JSON.parse(m.coordinates) as number[][],
    createdById: m.createdById,
    createdByName: m.createdBy?.fullName ?? null,
  }));

  const canManage = can(session.role, "marking.create");

  return (
    <div>
      <PageHeader
        title="Map Marking"
        subtitle={canManage ? "Draw and manage no-fly, restricted, and custom zones" : "Marked zones (view only)"}
      />
      <div className="p-6">
        <MarkingManager
          initial={markings}
          canManage={canManage}
          currentUserId={session.sub}
          currentUserName={session.fullName}
          isAdmin={session.role === "ADMIN"}
        />
      </div>
    </div>
  );
}
