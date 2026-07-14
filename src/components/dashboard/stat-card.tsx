import * as React from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "text-emerald-400",
  hint,
}: {
  label: string;
  value: number | string;
  icon?: React.ElementType;
  tone?: string;
  hint?: string;
}) {
  return (
    <div className="panel group relative overflow-hidden p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-50">{value}</p>
          {hint && <p className="mt-1 text-[0.68rem] text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn("grid h-9 w-9 place-items-center rounded-lg bg-white/5", tone)}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
      </div>
    </div>
  );
}

export function MiniStat({
  label,
  value,
  dot,
}: {
  label: string;
  value: number;
  dot: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/8 bg-navy-950/40 px-3 py-2.5">
      <span className="flex items-center gap-2 text-xs text-slate-400">
        <span className={cn("h-2 w-2 rounded-full", dot)} />
        {label}
      </span>
      <span className="font-mono text-sm font-bold text-slate-100">{value}</span>
    </div>
  );
}
