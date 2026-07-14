"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, UserCog, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { RoleBadge, ApprovalBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ROLES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export type ManagedUser = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  rank: string | null;
  unit: string | null;
  armyNumber: string | null;
  role: string;
  approvalStatus: string;
  createdAt: string;
};

export function UserManagement({ initial, currentUserId }: { initial: ManagedUser[]; currentUserId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [users, setUsers] = React.useState(initial);

  const pending = users.filter((u) => u.approvalStatus === "PENDING");

  async function patch(id: string, body: Record<string, string>, msg: string) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return push({ kind: "error", title: "Failed", message: data.error });
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...body } : u)));
    push({ kind: "success", title: msg });
    router.refresh();
  }

  async function remove(u: ManagedUser) {
    if (!confirm(`Delete ${u.fullName}?`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return push({ kind: "error", title: "Failed", message: data.error });
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
    push({ kind: "success", title: "User removed" });
  }

  return (
    <div className="space-y-6">
      {/* Pending requests */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Clock className="h-3.5 w-3.5 text-amber-400" /> Pending User Requests
          {pending.length > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-500/20 px-1.5 text-[0.65rem] text-amber-300">
              {pending.length}
            </span>
          )}
        </h2>
        {pending.length === 0 ? (
          <div className="panel p-6 text-center text-sm text-slate-500">No pending requests.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <AnimatePresence>
              {pending.map((u) => (
                <motion.div
                  key={u.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="panel p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{u.fullName}</p>
                      <p className="text-xs text-slate-500">{u.rank} · {u.unit}</p>
                    </div>
                    <ApprovalBadge status={u.approvalStatus} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[0.72rem]">
                    <div><dt className="text-slate-600">Army No.</dt><dd className="font-mono text-slate-300">{u.armyNumber}</dd></div>
                    <div><dt className="text-slate-600">Username</dt><dd className="text-slate-300">{u.username}</dd></div>
                    <div className="col-span-2"><dt className="text-slate-600">Email</dt><dd className="text-slate-300">{u.email}</dd></div>
                  </dl>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="success" className="flex-1 justify-center" onClick={() => patch(u.id, { approvalStatus: "APPROVED" }, "User approved")}>
                      <Check className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="danger" className="flex-1 justify-center" onClick={() => patch(u.id, { approvalStatus: "REJECTED" }, "User rejected")}>
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* All users */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <UserCog className="h-3.5 w-3.5" /> All Users ({users.length})
        </h2>
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left text-[0.68rem] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Manage</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-100">{u.fullName}</p>
                    <p className="text-[0.7rem] text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{u.unit ?? "—"}</td>
                  <td className="px-4 py-3"><ApprovalBadge status={u.approvalStatus} /></td>
                  <td className="px-4 py-3">
                    {u.id === currentUserId ? (
                      <RoleBadge role={u.role} />
                    ) : (
                      <Select
                        value={u.role}
                        onChange={(e) => patch(u.id, { role: e.target.value }, "Role updated")}
                        className="h-8 w-32 text-xs"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </Select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== currentUserId && u.role !== "ADMIN" && (
                      <button onClick={() => remove(u)} className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-red-500/10 hover:text-red-300">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
