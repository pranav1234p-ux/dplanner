// Central definitions for roles, statuses, and their display metadata.
// SQLite has no native enums, so these string unions are the source of truth.

export const ROLES = ["ADMIN", "OPERATOR", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const DRONE_STATUSES = ["ACTIVE", "STANDBY", "MAINTENANCE"] as const;
export type DroneStatus = (typeof DRONE_STATUSES)[number];

export const MISSION_STATUSES = [
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
  "EXPIRED",
  "CANCELLED",
] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const MAP_OBJECT_TYPES = ["polygon", "circle", "line", "rectangle"] as const;
export type MapObjectType = (typeof MAP_OBJECT_TYPES)[number];

export const MARKING_SHAPES = ["marker", "line", "circle", "rectangle", "polygon"] as const;
export type MarkingShape = (typeof MARKING_SHAPES)[number];

export const MARKING_CATEGORIES = ["NO_FLY", "RESTRICTED", "CUSTOM"] as const;
export type MarkingCategory = (typeof MARKING_CATEGORIES)[number];

export const MARKING_CATEGORY_META: Record<
  MarkingCategory,
  { label: string; color: string; tone: string }
> = {
  NO_FLY: { label: "No-Fly Zone", color: "#ef4444", tone: "text-red-300 bg-red-500/10 border-red-500/30" },
  RESTRICTED: { label: "Restricted Zone", color: "#f59e0b", tone: "text-amber-300 bg-amber-500/10 border-amber-500/30" },
  CUSTOM: { label: "Custom", color: "#38bdf8", tone: "text-sky-300 bg-sky-500/10 border-sky-500/30" },
};

export const CLASSIFICATIONS = [
  "UNCLASSIFIED",
  "RESTRICTED",
  "CONFIDENTIAL",
  "SECRET",
  "TOP_SECRET",
] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export const CLASSIFICATION_META: Record<Classification, { label: string; tone: string }> = {
  UNCLASSIFIED: { label: "Unclassified", tone: "text-slate-300 bg-slate-500/15 border-slate-500/30" },
  RESTRICTED: { label: "Restricted", tone: "text-sky-300 bg-sky-500/15 border-sky-500/30" },
  CONFIDENTIAL: { label: "Confidential", tone: "text-amber-300 bg-amber-500/15 border-amber-500/30" },
  SECRET: { label: "Secret", tone: "text-orange-300 bg-orange-500/15 border-orange-500/40" },
  TOP_SECRET: { label: "Top Secret", tone: "text-red-300 bg-red-500/15 border-red-500/40" },
};

// Distinct colors assigned to missions on the overview map (cycled by index).
export const MISSION_COLORS = [
  "#4ade80", "#38bdf8", "#f472b6", "#facc15", "#a78bfa",
  "#fb923c", "#2dd4bf", "#f87171", "#a3e635", "#e879f9",
];

// Tailwind-friendly color tokens for status badges.
export const DRONE_STATUS_META: Record<DroneStatus, { label: string; tone: string; dot: string }> = {
  ACTIVE: { label: "Active", tone: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30", dot: "bg-emerald-400" },
  STANDBY: { label: "Standby", tone: "text-amber-300 bg-amber-500/10 border-amber-500/30", dot: "bg-amber-400" },
  MAINTENANCE: { label: "Maintenance", tone: "text-red-300 bg-red-500/10 border-red-500/30", dot: "bg-red-400" },
};

export const MISSION_STATUS_META: Record<MissionStatus, { label: string; tone: string }> = {
  PLANNED: { label: "Planned", tone: "text-sky-300 bg-sky-500/10 border-sky-500/30" },
  ACTIVE: { label: "Active", tone: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" },
  COMPLETED: { label: "Completed", tone: "text-slate-300 bg-slate-500/10 border-slate-500/30" },
  EXPIRED: { label: "Expired", tone: "text-amber-300 bg-amber-500/10 border-amber-500/30" },
  CANCELLED: { label: "Cancelled", tone: "text-red-300 bg-red-500/10 border-red-500/30" },
};

export const APPROVAL_STATUS_META: Record<ApprovalStatus, { label: string; tone: string }> = {
  PENDING: { label: "Pending", tone: "text-amber-300 bg-amber-500/10 border-amber-500/30" },
  APPROVED: { label: "Approved", tone: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" },
  REJECTED: { label: "Rejected", tone: "text-red-300 bg-red-500/10 border-red-500/30" },
};

export const ROLE_META: Record<Role, { label: string; tone: string }> = {
  ADMIN: { label: "Administrator", tone: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" },
  OPERATOR: { label: "Operator", tone: "text-sky-300 bg-sky-500/10 border-sky-500/30" },
  VIEWER: { label: "Viewer", tone: "text-slate-300 bg-slate-500/10 border-slate-500/30" },
};

export const APP_INFO = {
  name: "Drone Command Center",
  version: "1.0.0",
  developer: "Lt Pranav Kumar Dev",
  lastUpdated: "2026-07-14",
  license: "Proprietary — Authorized Use Only",
  contact: "157 Lt AD Regt (Comp)",
};
