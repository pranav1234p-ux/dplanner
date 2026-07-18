import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword, createToken, setSessionCookie } from "@/lib/auth";
import {
  masterAdminEnabled,
  isMasterUsername,
  verifyMasterPassword,
  masterFullName,
  MASTER_ADMIN_SYNTHETIC_SUB,
} from "@/lib/master-admin";
import { route, ApiError, audit } from "@/lib/api";
import type { Role } from "@/lib/constants";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const POST = route(async (req: Request) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, "Username and password are required");

  const { username, password } = parsed.data;

  // Break-glass master admin: credentials come from env only, so it can sign in
  // even when the database is unreachable. Checked before any DB access.
  if (masterAdminEnabled() && isMasterUsername(username)) {
    if (!(await verifyMasterPassword(password))) {
      throw new ApiError(401, "Invalid username or password");
    }
    const fullName = masterFullName();

    // Online: attach (or refresh) a real user row so foreign-key attribution
    // works for approvals/creates. The DB row's password is random and unusable
    // — the master only ever authenticates via env, so removing the env var
    // fully disables it. Offline: the DB is unreachable, so fall back to a
    // synthetic identity and still issue the session (view access).
    let sub: string = MASTER_ADMIN_SYNTHETIC_SUB;
    try {
      const row = await prisma.user.upsert({
        where: { username },
        update: { role: "ADMIN", approvalStatus: "APPROVED" },
        create: {
          username,
          password: await hashPassword(randomUUID()),
          role: "ADMIN",
          approvalStatus: "APPROVED",
          fullName,
          email: `${username}@master.local`,
        },
      });
      sub = row.id;
    } catch {
      // Database unreachable — offline master login with a synthetic identity.
    }

    const token = await createToken({ sub, username, role: "ADMIN", fullName, unit: null });
    await setSessionCookie(token);

    // Best-effort — must never block an offline login.
    try {
      await audit({
        action: "LOGIN",
        detail: `${fullName} (master admin) signed in.`,
        session: { sub, username, role: "ADMIN", fullName },
      });
    } catch {
      /* database unreachable */
    }

    return NextResponse.json({ user: { id: sub, username, role: "ADMIN", fullName } });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await verifyPassword(password, user.password))) {
    throw new ApiError(401, "Invalid username or password");
  }

  if (user.approvalStatus === "PENDING") {
    throw new ApiError(403, "Your account is pending administrator approval");
  }
  if (user.approvalStatus === "REJECTED") {
    throw new ApiError(403, "Your account registration was rejected");
  }

  const token = await createToken({
    sub: user.id,
    username: user.username,
    role: user.role as Role,
    fullName: user.fullName,
    unit: user.unit,
  });
  await setSessionCookie(token);

  await audit({
    action: "LOGIN",
    detail: `${user.fullName} signed in.`,
    session: { sub: user.id, username: user.username, role: user.role as Role, fullName: user.fullName },
  });

  return NextResponse.json({
    user: { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
  });
});
