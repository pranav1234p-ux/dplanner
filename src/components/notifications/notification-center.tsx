"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCheck, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { timeAgo } from "@/lib/utils";

export type Note = { id: string; title: string; message: string; type: string; read: boolean; createdAt: string };

const ICON: Record<string, { icon: React.ElementType; tone: string }> = {
  SUCCESS: { icon: CheckCircle2, tone: "text-sky-400" },
  WARNING: { icon: AlertTriangle, tone: "text-amber-400" },
  INFO: { icon: Info, tone: "text-sky-400" },
};

export function NotificationCenter({ initial }: { initial: Note[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [notes, setNotes] = React.useState(initial);
  const unread = notes.filter((n) => !n.read).length;

  async function markAll() {
    const res = await fetch("/api/notifications/read", { method: "POST" });
    if (!res.ok) return push({ kind: "error", title: "Failed to mark read" });
    setNotes((prev) => prev.map((n) => ({ ...n, read: true })));
    push({ kind: "success", title: "All notifications marked read" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}` : "You're all caught up"}
        </p>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}>
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notes.map((n, i) => {
          const meta = ICON[n.type] ?? ICON.INFO;
          const Icon = meta.icon;
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className={`panel flex items-start gap-3 p-4 ${!n.read ? "border-l-2 border-l-sky-500/60" : "opacity-70"}`}
            >
              <Icon className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${meta.tone}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100">{n.title}</p>
                  <span className="shrink-0 text-[0.68rem] uppercase tracking-wider text-slate-500">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-sm text-slate-400">{n.message}</p>
              </div>
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-400" />}
            </motion.div>
          );
        })}
        {notes.length === 0 && <div className="panel p-12 text-center text-sm text-slate-500">No notifications.</div>}
      </div>
    </div>
  );
}
