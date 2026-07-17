import type { Role } from "./constants";

// Fine-grained permissions derived from the role specification.
export type Permission =
  | "drone.create"
  | "drone.edit"
  | "drone.delete"
  | "drone.status"
  | "mission.create"
  | "mission.editOwn"
  | "mission.delete"
  | "mission.status"
  | "mission.approve"
  | "mission.generateAdc"
  | "mission.viewAll"
  | "nfz.manage"
  | "marking.create"
  | "user.approve"
  | "user.manage"
  | "analytics.view"
  | "detection.run";

const ADMIN_PERMISSIONS: Permission[] = [
  "drone.create",
  "drone.edit",
  "drone.delete",
  "drone.status",
  "mission.create",
  "mission.editOwn",
  "mission.delete",
  "mission.status",
  "mission.approve",
  "mission.generateAdc",
  "mission.viewAll",
  "nfz.manage",
  "marking.create",
  "user.approve",
  "user.manage",
  "analytics.view",
  "detection.run",
];

const OPERATOR_PERMISSIONS: Permission[] = [
  "drone.create",
  "drone.status",
  "mission.create",
  "mission.editOwn",
  "marking.create",
  "detection.run",
];

const VIEWER_PERMISSIONS: Permission[] = [];

const MATRIX: Record<Role, Permission[]> = {
  ADMIN: ADMIN_PERMISSIONS,
  OPERATOR: OPERATOR_PERMISSIONS,
  VIEWER: VIEWER_PERMISSIONS,
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

export function permissionsFor(role: Role): Permission[] {
  return MATRIX[role] ?? [];
}

/** Convenience guards used widely across the UI and API. */
export const isAdmin = (role: Role) => role === "ADMIN";
export const canEdit = (role: Role) => role === "ADMIN" || role === "OPERATOR";
