import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { Planner } from "@/components/planner/planner";
import type { Marking } from "@/components/planner/planner-map";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  const session = (await getSession())!;
  // Operators may only plan missions for drones they added; admins see all.
  const droneWhere = session.role === "OPERATOR" ? { createdById: session.sub } : undefined;
  const [drones, rows] = await Promise.all([
    prisma.drone.findMany({ where: droneWhere, orderBy: { name: "asc" } }),
    prisma.mapMarking.findMany({ include: { createdBy: { select: { fullName: true } } } }),
  ]);

  const markings: Marking[] = rows.map((m) => ({
    id: m.id,
    name: m.name,
    shapeType: m.shapeType,
    category: m.category,
    color: m.color,
    coordinates: JSON.parse(m.coordinates) as number[][],
    createdByName: m.createdBy?.fullName ?? null,
  }));

  return (
    <div className="h-full">
      <Planner drones={drones} markings={markings} canCreate={can(session.role, "mission.create")} />
    </div>
  );
}
