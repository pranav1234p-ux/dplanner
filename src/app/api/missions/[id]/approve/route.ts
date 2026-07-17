import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, requirePermission, audit, ApiError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  // Omitted / empty = generate the next number automatically.
  adcNumber: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[A-Za-z0-9][A-Za-z0-9/\-\s]*$/, "Use letters, numbers, spaces, - or / only")
    .optional(),
});

/** Next sequential ADC number for this year, e.g. ADC-2026-0003. Derived from the
 *  highest number already issued this year rather than a count, so manually-entered
 *  numbers and deleted missions can't cause a collision. */
async function nextAdcNumber(): Promise<string> {
  const prefix = `ADC-${new Date().getFullYear()}-`;
  const issued = await prisma.mission.findMany({
    where: { adcNumber: { startsWith: prefix } },
    select: { adcNumber: true },
  });
  const highest = issued.reduce((max, m) => {
    const n = Number.parseInt(m.adcNumber!.slice(prefix.length), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(4, "0")}`;
}

export const POST = route(async (req: Request, { params }: Params) => {
  const session = await requirePermission("mission.approve");
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue?.message ?? "Invalid decision" }, { status: 400 });
  }

  const mission = await prisma.mission.findUnique({ where: { id } });
  if (!mission) throw new ApiError(404, "Mission not found");
  if (mission.approvalStatus === "APPROVED") {
    throw new ApiError(409, "Mission is already approved");
  }

  if (parsed.data.decision === "REJECT") {
    const updated = await prisma.mission.update({
      where: { id },
      data: { approvalStatus: "REJECTED", approvedById: session.sub, approvedAt: new Date() },
    });
    await audit({
      action: "MISSION_REJECTED",
      detail: `${mission.missionCode} flight plan rejected.`,
      session,
      notify: { title: "Mission Rejected", message: `${mission.missionCode} was not approved.`, type: "WARNING" },
    });
    return NextResponse.json({ mission: updated });
  }

  const custom = parsed.data.adcNumber;
  if (custom) {
    // adcNumber has no DB-level unique constraint, so guard against handing the
    // same ADC to two missions.
    const clash = await prisma.mission.findFirst({
      where: { adcNumber: custom, NOT: { id } },
      select: { missionCode: true },
    });
    if (clash) throw new ApiError(409, `ADC ${custom} is already assigned to ${clash.missionCode}`);
  }
  const adcNumber = custom ?? (await nextAdcNumber());

  const updated = await prisma.mission.update({
    where: { id },
    data: {
      approvalStatus: "APPROVED",
      adcNumber,
      approvedById: session.sub,
      approvedAt: new Date(),
    },
  });

  await audit({
    action: "FLIGHT_APPROVED",
    detail: `${mission.missionCode} approved. ${adcNumber} ${custom ? "assigned manually" : "generated and assigned"}.`,
    session,
    notify: {
      title: "Mission Approved",
      message: `${mission.missionCode} approved — ${adcNumber} assigned.`,
      type: "SUCCESS",
    },
  });

  return NextResponse.json({ mission: updated });
});
