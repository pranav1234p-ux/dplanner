"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, CheckCheck, ClipboardCheck, X } from "lucide-react";
import { timeAgo } from "@/lib/utils";

type Note = { id: string; title: string; message: string; type: string; read: boolean; createdAt: string };
type Pending = { id: string; missionCode: string; missionName: string; createdBy: { fullName: string } };

const ICON: Record<string, { icon: React.ElementType; tone: string }> = {
  SUCCESS: { icon: CheckCircle2, tone: "text-sky-400" },
  WARNING: { icon: AlertTriangle, tone: "text-amber-400" },
  INFO: { icon: Info, tone: "text-sky-400" },
};

export function NotificationPopup({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [pending, setPending] = React.useState<Pending[]>([]);
  const [canApprove, setCanApprove] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        setNotes(d.notifications ?? []);
        setPending(d.pendingMissions ?? []);
        setCanApprove(!!d.canApprove);
      })
      .finally(() => setLoading(false));
  }, []);

  const unread = notes.filter((n) => !n.read).length;

  async function markAll() {
    await fetch("/api/notifications/read", { method: "POST" });
    setNotes((prev) => prev.map((n) => ({ ...n, read: true })));
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      className="panel fixed right-3 top-14 z-[9500] flex max-h-[75vh] w-[92vw] max-w-sm flex-col overflow-hidden shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
          Notifications {unread > 0 && <span className="text-sky-400">({unread})</span>}
        </p>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button onClick={markAll} title="Mark all read" className="rounded p-1 text-slate-400 hover:text-sky-300">
              <CheckCheck className="h-4 w-4" />
            </button>
          )}
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Pending missions (admin + operator) */}
        {pending.length > 0 && (
          <div className="border-b border-white/8 p-2">
            <p className="px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-wider text-amber-400">
              Pending Missions ({pending.length})
            </p>
            {pending.map((m) => (
              <Link
                key={m.id}
                href={`/missions/${m.id}`}
                onClick={onClose}
                className="flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-white/5"
              >
                <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-100">
                    <span className="font-mono text-sky-300">{m.missionCode}</span> · {m.missionName}
                  </p>
                  <p className="text-[0.7rem] text-slate-500">
                    by {m.createdBy.fullName} · {canApprove ? "tap to approve & assign ADC" : "awaiting approval"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Notifications */}
        <div className="p-2">
          {loading && <p className="p-4 text-center text-xs text-slate-500">Loading…</p>}
          {!loading && notes.length === 0 && pending.length === 0 && (
            <p className="p-6 text-center text-sm text-slate-500">You&apos;re all caught up.</p>
          )}
          {notes.map((n) => {
            const meta = ICON[n.type] ?? ICON.INFO;
            const Icon = meta.icon;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-2.5 rounded-lg px-2 py-2 ${!n.read ? "bg-sky-500/[0.04]" : ""}`}
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.tone}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100">{n.title}</p>
                    <span className="shrink-0 text-[0.62rem] uppercase tracking-wider text-slate-500">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{n.message}</p>
                </div>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-400" />}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
