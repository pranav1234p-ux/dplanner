import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { UserManagement, type ManagedUser } from "@/components/users/user-management";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = (await getSession())!;
  if (session.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({ orderBy: [{ approvalStatus: "asc" }, { createdAt: "desc" }] });
  const rows: ManagedUser[] = users.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    username: u.username,
    email: u.email,
    rank: u.rank,
    unit: u.unit,
    armyNumber: u.armyNumber,
    role: u.role,
    approvalStatus: u.approvalStatus,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader title="User Management" subtitle="Approve registrations and manage roles" />
      <div className="p-6">
        <UserManagement initial={rows} currentUserId={session.sub} />
      </div>
    </div>
  );
}
