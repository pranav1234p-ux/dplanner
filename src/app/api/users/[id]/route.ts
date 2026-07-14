import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, requirePermission, audit, ApiError } from "@/lib/api";
import { ROLES, APPROVAL_STATUSES } from "@/lib/constants";
import { regenerateApprovedCredentialsFile } from "@/lib/credentials-file";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  approvalStatus: z.enum(APPROVAL_STATUSES).optional(),
  role: z.enum(ROLES).optional(),
});

export const PATCH = route(async (req: Request, { params }: Params) => {
  const session = await requirePermission("user.manage");
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) throw new ApiError(404, "User not found");

  const user = await prisma.user.update({ where: { id }, data: parsed.data });

  if (parsed.data.approvalStatus && parsed.data.approvalStatus !== before.approvalStatus) {
    const approved = parsed.data.approvalStatus === "APPROVED";
    await audit({
      action: approved ? "USER_APPROVED" : "USER_REJECTED",
      detail: `${user.fullName} account ${approved ? "approved" : "rejected"}.`,
      session,
      notify: {
        title: approved ? "User Approved" : "User Rejected",
        message: `${user.fullName} was ${approved ? "approved" : "rejected"}.`,
        type: approved ? "SUCCESS" : "WARNING",
      },
    });
  }
  if (parsed.data.role && parsed.data.role !== before.role) {
    await audit({ action: "USER_ROLE_CHANGED", detail: `${user.fullName} role → ${user.role}.`, session });
  }

  // Keep the approved-credentials file in sync with approvals/rejections/role changes.
  await regenerateApprovedCredentialsFile();

  return NextResponse.json({
    user: { id: user.id, approvalStatus: user.approvalStatus, role: user.role },
  });
});

export const DELETE = route(async (_req: Request, { params }: Params) => {
  const session = await requirePermission("user.manage");
  const { id } = await params;
  if (id === session.sub) throw new ApiError(400, "You cannot delete your own account");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, "User not found");
  if (user.role === "ADMIN") throw new ApiError(400, "Administrator accounts cannot be deleted here");
  await prisma.user.delete({ where: { id } });
  await audit({ action: "USER_DELETED", detail: `${user.fullName} account removed.`, session });
  return NextResponse.json({ ok: true });
});
