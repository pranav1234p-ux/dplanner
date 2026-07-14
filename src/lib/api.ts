import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "./auth";
import { can, type Permission } from "./rbac";
import { prisma } from "./prisma";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Authentication required");
  return session;
}

export async function requirePermission(permission: Permission): Promise<SessionPayload> {
  const session = await requireSession();
  if (!can(session.role, permission)) {
    throw new ApiError(403, "You do not have permission to perform this action");
  }
  return session;
}

/** Wraps a route handler so thrown ApiErrors become clean JSON responses. */
export function route<T extends unknown[]>(
  fn: (...args: T) => Promise<NextResponse>,
): (...args: T) => Promise<NextResponse> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error("API error:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

// Actions whose notifications viewers are allowed to see: new drones, new
// missions, and ongoing mission status. Everything else (sign-ins, user
// approvals, drone status/edits, markings, etc.) is hidden from viewers.
const VIEWER_VISIBLE_ACTIONS = new Set([
  "DRONE_ADDED",
  "MISSION_CREATED",
  "MISSION_STATUS_CHANGED",
  "FLIGHT_APPROVED",
  "MISSION_APPROVED",
  "MISSION_REJECTED",
  "ADC_GENERATED",
  "MISSION_COMPLETED",
]);

// User-management / account events are only ever shown to administrators.
const ADMIN_ONLY_ACTIONS = new Set([
  "USER_REGISTERED",
  "USER_APPROVED",
  "USER_REJECTED",
  "USER_ROLE_CHANGED",
  "USER_DELETED",
  "CREDENTIALS_CHANGED",
]);

/** Compute the role audience for a notification from the action and the actor.
 *  - ADMIN always included (admins see everything).
 *  - User-management events are admin-only.
 *  - VIEWER only for viewer-visible actions.
 *  - OPERATOR excluded when an operator is the actor, so operators never see
 *    another operator's activity (but do see admin/system events).
 */
function computeAudience(action: string, actorRole?: string): string {
  if (ADMIN_ONLY_ACTIONS.has(action)) return "ADMIN";
  const roles = ["ADMIN"];
  if (VIEWER_VISIBLE_ACTIONS.has(action)) roles.push("VIEWER");
  if (actorRole !== "OPERATOR") roles.push("OPERATOR");
  return roles.join(",");
}

/** Record an audit-log entry, and optionally emit a role-scoped notification. */
export async function audit(opts: {
  action: string;
  detail: string;
  session?: SessionPayload | null;
  notify?: {
    title: string;
    message: string;
    type?: string;
    audience?: string; // override the computed audience
    recipientId?: string | null; // direct notification to a single user
  };
}) {
  await prisma.auditLog.create({
    data: {
      action: opts.action,
      detail: opts.detail,
      userId: opts.session?.sub ?? null,
      actorName: opts.session?.fullName ?? null,
    },
  });
  if (opts.notify) {
    await prisma.notification.create({
      data: {
        title: opts.notify.title,
        message: opts.notify.message,
        type: opts.notify.type ?? "INFO",
        audience: opts.notify.audience ?? computeAudience(opts.action, opts.session?.role),
        userId: opts.notify.recipientId ?? null,
      },
    });
  }
}

/** Build the Prisma "where" clause that scopes notifications to a given viewer. */
export function notificationScope(userId: string, role: string) {
  return {
    OR: [
      { userId }, // addressed to me specifically
      { audience: { contains: role } }, // my role is in the audience list
    ],
  };
}
