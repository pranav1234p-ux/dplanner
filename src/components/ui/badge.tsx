import * as React from "react";
import { cn } from "@/lib/utils";
import {
  DRONE_STATUS_META,
  MISSION_STATUS_META,
  APPROVAL_STATUS_META,
  ROLE_META,
  type DroneStatus,
  type MissionStatus,
  type ApprovalStatus,
  type Role,
} from "@/lib/constants";

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wider",
        tone ?? "text-slate-300 bg-slate-500/10 border-slate-500/30",
        className,
      )}
      {...props}
    />
  );
}

export function DroneStatusBadge({ status }: { status: string }) {
  const meta = DRONE_STATUS_META[status as DroneStatus] ?? DRONE_STATUS_META.STANDBY;
  return (
    <Badge tone={meta.tone}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </Badge>
  );
}

export function MissionStatusBadge({ status }: { status: string }) {
  const meta = MISSION_STATUS_META[status as MissionStatus] ?? MISSION_STATUS_META.PLANNED;
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function ApprovalBadge({ status }: { status: string }) {
  const meta = APPROVAL_STATUS_META[status as ApprovalStatus] ?? APPROVAL_STATUS_META.PENDING;
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role as Role] ?? ROLE_META.VIEWER;
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
