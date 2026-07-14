import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, requireSession, ApiError } from "@/lib/api";
import { CLASSIFICATIONS } from "@/lib/constants";

export const GET = route(async () => {
  const session = await requireSession();

  const [contacts, messages] = await Promise.all([
    prisma.user.findMany({
      where: { approvalStatus: "APPROVED", id: { not: session.sub } },
      select: { id: true, fullName: true, rank: true, unit: true, role: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.message.findMany({
      where: {
        OR: [{ senderId: session.sub }, { recipientId: session.sub }, { recipientId: null }],
      },
      orderBy: { createdAt: "asc" },
      take: 500,
    }),
  ]);

  // Hide messages the viewer deleted for themselves.
  const visible = messages.filter((m) => !m.deletedFor.split(",").includes(session.sub));

  return NextResponse.json({ contacts, messages: visible, me: session.sub });
});

const attachmentSchema = z.object({
  name: z.string(),
  type: z.string(),
  size: z.number(),
  dataUrl: z.string(),
});

const sendSchema = z.object({
  recipientId: z.string().nullable(), // null = broadcast (admin only)
  body: z.string().max(2000).default(""),
  classification: z.enum(CLASSIFICATIONS).default("UNCLASSIFIED"),
  attachments: z.array(attachmentSchema).max(5).default([]),
});

const MAX_TOTAL_BYTES = 14 * 1024 * 1024; // ~14 MB of base64 per message

export const POST = route(async (req: Request) => {
  const session = await requireSession();
  const parsed = sendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { recipientId, body, classification, attachments } = parsed.data;

  if (!body.trim() && attachments.length === 0) {
    return NextResponse.json({ error: "Message or attachment required" }, { status: 400 });
  }
  const totalBytes = attachments.reduce((s, a) => s + a.dataUrl.length, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "Attachments too large (max ~10 MB total)" }, { status: 413 });
  }

  if (recipientId === null && session.role !== "ADMIN") {
    throw new ApiError(403, "Only administrators can broadcast to everyone");
  }
  if (recipientId) {
    const exists = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!exists) throw new ApiError(404, "Recipient not found");
  }

  const message = await prisma.message.create({
    data: {
      senderId: session.sub,
      senderName: session.fullName,
      recipientId,
      body,
      classification,
      attachments: JSON.stringify(attachments),
    },
  });

  return NextResponse.json({ message }, { status: 201 });
});
