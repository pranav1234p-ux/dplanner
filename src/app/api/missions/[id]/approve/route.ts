import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, requirePermission, audit, ApiError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ decision: z.enum(["APPROVE", "REJECT"]) });

/** Generate the next sequential ADC number, e.g. ADC-2026-0003. */
async function nextAdcNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.mission.count({ where: { adcNumber: { not: null } } });
  return `ADC-${year}-${String(count + 1).padStart(4, "0")}`;
}

export const POST = route(async (req: Request, { params }: Params) => {
  const session = await requirePermission("mission.approve");
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid decision" }, { status: 400 });

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

  const adcNumber = await nextAdcNumber();
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
    detail: `${mission.missionCode} approved. ${adcNumber} generated and assigned.`,
    session,
    notify: {
      title: "Mission Approved",
      message: `${mission.missionCode} approved — ${adcNumber} assigned.`,
      type: "SUCCESS",
    },
  });

  return NextResponse.json({ mission: updated });
});
