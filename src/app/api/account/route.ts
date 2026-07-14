import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, requireSession, audit, ApiError } from "@/lib/api";
import {
  verifyPassword,
  hashPassword,
  createToken,
  setSessionCookie,
} from "@/lib/auth";
import {
  setPlainPassword,
  renameStoredUser,
  regenerateApprovedCredentialsFile,
} from "@/lib/credentials-file";
import type { Role } from "@/lib/constants";

const opt = (s: z.ZodString) => s.optional().or(z.literal(""));

const schema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newUsername: opt(z.string().min(3)),
  newPassword: opt(z.string().min(6)),
  fullName: opt(z.string().min(2)),
  email: opt(z.string().email()),
  rank: z.string().optional(),
  unit: z.string().optional(),
  armyNumber: z.string().optional(),
});

export const PATCH = route(async (req: Request) => {
  const session = await requireSession();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid data");
  }
  const p = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) throw new ApiError(404, "Account not found");
  if (!(await verifyPassword(p.currentPassword, user.password))) {
    throw new ApiError(401, "Current password is incorrect");
  }

  const data: Record<string, string> = {};

  if (p.newUsername && p.newUsername !== user.username) {
    const clash = await prisma.user.findUnique({ where: { username: p.newUsername } });
    if (clash) throw new ApiError(409, "That username is already taken");
    data.username = p.newUsername;
  }
  if (p.email && p.email !== user.email) {
    const clash = await prisma.user.findUnique({ where: { email: p.email } });
    if (clash) throw new ApiError(409, "That email is already in use");
    data.email = p.email;
  }
  if (p.newPassword) data.password = await hashPassword(p.newPassword);
  if (p.fullName && p.fullName !== user.fullName) data.fullName = p.fullName;
  if (p.rank !== undefined && p.rank !== (user.rank ?? "")) data.rank = p.rank;
  if (p.unit !== undefined && p.unit !== (user.unit ?? "")) data.unit = p.unit;
  if (p.armyNumber !== undefined && p.armyNumber !== (user.armyNumber ?? "")) data.armyNumber = p.armyNumber;

  if (Object.keys(data).length === 0) throw new ApiError(400, "No changes to apply");

  const updated = await prisma.user.update({ where: { id: user.id }, data });

  // Keep the plaintext credentials store + approved-credentials file in sync.
  if (data.username && data.username !== user.username) {
    renameStoredUser(user.username, updated.username, p.newPassword || undefined);
  }
  if (p.newPassword) {
    setPlainPassword(updated.username, p.newPassword);
  }
  await regenerateApprovedCredentialsFile();

  // Re-issue the session token so username / display fields stay consistent.
  const token = await createToken({
    sub: updated.id,
    username: updated.username,
    role: updated.role as Role,
    fullName: updated.fullName,
    unit: updated.unit,
  });
  await setSessionCookie(token);

  await audit({
    action: "CREDENTIALS_CHANGED",
    detail: `${updated.fullName} updated their account details.`,
    session,
  });

  return NextResponse.json({ ok: true, username: updated.username });
});
