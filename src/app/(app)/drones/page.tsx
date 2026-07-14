import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { DroneDirectory } from "@/components/drones/drone-directory";

export const dynamic = "force-dynamic";

export default async function DronesPage() {
  const session = (await getSession())!;
  const drones = await prisma.drone.findMany({ orderBy: { droneId: "asc" } });

  const perms = {
    canCreate: can(session.role, "drone.create"),
    canEdit: can(session.role, "drone.edit"),
    canDelete: can(session.role, "drone.delete"), // admin: delete any
    canDeleteOwn: session.role === "OPERATOR", // operator: delete own only
    canStatus: can(session.role, "drone.status"),
  };

  return (
    <div>
      <PageHeader title="Drone Directory" subtitle={`${drones.length} drones in fleet registry`} />
      <div className="p-6">
        <DroneDirectory initial={drones} perms={perms} currentUserId={session.sub} />
      </div>
    </div>
  );
}
