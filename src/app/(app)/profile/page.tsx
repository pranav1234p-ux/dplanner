import Link from "next/link";
import { User, Mail, Shield, Building2, Hash, Award, ListChecks, Plane, Settings, Users, Activity, PencilRuler } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RoleBadge, ApprovalBadge } from "@/components/ui/badge";
import { CredentialsForm } from "@/components/profile/credentials-form";
import { timeAgo } from "@/lib/utils";
import { KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-slate-500" />
      <span className="w-32 shrink-0 text-[0.7rem] uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-sm text-slate-200">{value}</span>
    </div>
  );
}

export default async function ProfilePage() {
  const session = (await getSession())!;
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return null;

  const [missionsCreated, droneCount, recent] = await Promise.all([
    prisma.mission.count({ where: { createdById: user.id } }),
    prisma.drone.count(),
    prisma.auditLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  const isAdmin = user.role === "ADMIN";
  const isOperator = user.role === "OPERATOR";

  return (
    <div>
      <PageHeader title="Profile" subtitle="Your account and activity" />
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
        {/* Identity card */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center py-8 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-navy-700 text-2xl font-bold text-emerald-300 glow-green">
              {user.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("")}
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-50">{user.fullName}</h2>
            <p className="text-sm text-slate-500">@{user.username}</p>
            <div className="mt-3 flex gap-2">
              <RoleBadge role={user.role} />
              <ApprovalBadge status={user.approvalStatus} />
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Account Details</CardTitle></CardHeader>
          <CardContent className="divide-y divide-white/5 py-0">
            <Row icon={Shield} label="Role" value={<RoleBadge role={user.role} />} />
            <Row icon={Mail} label="Email" value={user.email} />
            <Row icon={Building2} label="Army Unit" value={user.unit ?? "—"} />
            {(isOperator || isAdmin) && <Row icon={Award} label="Rank" value={user.rank ?? "—"} />}
            <Row icon={Hash} label="Army Number" value={<span className="font-mono">{user.armyNumber ?? "—"}</span>} />
            {isOperator && (
              <>
                <Row icon={ListChecks} label="Missions Created" value={missionsCreated} />
                <Row icon={Plane} label="Fleet Drones" value={droneCount} />
                <Row icon={Shield} label="Approval" value={<ApprovalBadge status={user.approvalStatus} />} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Change own credentials / account details */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle><KeyRound className="h-3.5 w-3.5" /> Account &amp; Credentials</CardTitle>
          </CardHeader>
          <CardContent>
            <CredentialsForm
              user={{
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                rank: user.rank,
                unit: user.unit,
                armyNumber: user.armyNumber,
              }}
            />
          </CardContent>
        </Card>

        {/* Admin-only management shortcuts */}
        {isAdmin && (
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle><Settings className="h-3.5 w-3.5" /> System &amp; Users</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Link href="/users" className="flex items-center gap-2 rounded-lg border border-white/8 px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5">
                <Users className="h-4 w-4 text-emerald-400" /> User Management
              </Link>
              <Link href="/map-marking" className="flex items-center gap-2 rounded-lg border border-white/8 px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5">
                <PencilRuler className="h-4 w-4 text-emerald-400" /> Map Marking
              </Link>
              <Link href="/about" className="flex items-center gap-2 rounded-lg border border-white/8 px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5">
                <Settings className="h-4 w-4 text-emerald-400" /> Application Info
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Recent activity */}
        <Card className={isAdmin ? "lg:col-span-2" : "lg:col-span-3"}>
          <CardHeader><CardTitle><Activity className="h-3.5 w-3.5" /> Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-slate-500">No recorded activity yet.</p>
            ) : (
              <ol className="space-y-3">
                {recent.map((log) => (
                  <li key={log.id} className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <span className="text-sm text-slate-300">{log.detail}</span>
                    <span className="shrink-0 text-[0.68rem] uppercase tracking-wider text-slate-500">{timeAgo(log.createdAt)}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
