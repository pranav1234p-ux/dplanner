"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Plus, ArrowRight, Plane } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MissionStatusBadge, ApprovalBadge } from "@/components/ui/badge";
import { MISSION_STATUSES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export type MissionRow = {
  id: string;
  missionName: string;
  missionCode: string;
  unit: string | null;
  missionStatus: string;
  approvalStatus: string;
  adcNumber: string | null;
  droneName: string;
  createdBy: string;
  waypointCount: number;
  startTime: string | null;
};

export function MissionList({ missions, canCreate }: { missions: MissionRow[]; canCreate: boolean }) {
  const params = useSearchParams();
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const [status, setStatus] = React.useState("");

  const filtered = missions.filter((m) => {
    const hay = `${m.missionName} ${m.missionCode} ${m.unit ?? ""} ${m.droneName} ${m.adcNumber ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase()) && (!status || m.missionStatus === status);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input className="pl-9" placeholder="Search missions, ADC, drone…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select className="sm:w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {MISSION_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        {canCreate && (
          <Link href="/planner">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4" /> New Mission
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtered.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
          >
            <Link
              href={`/missions/${m.id}`}
              className="panel group flex flex-col gap-3 p-4 transition-colors hover:border-sky-500/30 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-sky-300">{m.missionCode}</span>
                  <MissionStatusBadge status={m.missionStatus} />
                  <ApprovalBadge status={m.approvalStatus} />
                  {m.adcNumber && (
                    <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-mono text-[0.68rem] text-sky-300">
                      {m.adcNumber}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 truncate text-sm font-semibold text-slate-100">{m.missionName}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[0.72rem] text-slate-500">
                  <span className="flex items-center gap-1"><Plane className="h-3 w-3" /> {m.droneName}</span>
                  <span>{m.unit ?? "—"}</span>
                  <span>{m.waypointCount} waypoints</span>
                  <span>{formatDateTime(m.startTime)}</span>
                </div>
              </div>
              <ArrowRight className="hidden h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-sky-400 sm:block" />
            </Link>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="panel p-12 text-center text-sm text-slate-500">No missions match your search.</div>
        )}
      </div>
    </div>
  );
}
