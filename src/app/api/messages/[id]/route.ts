import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, requireSession, ApiError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

const EDIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const schema = z.object({
  action: z.enum(["edit", "unsend", "delete"]),
  body: z.string().min(1).max(2000).optional(),
});

export const PATCH = route(async (req: Request, { params }: Params) => {
  const session = await requireSession();
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const msg = await prisma.message.findUnique({ where: { id } });
  if (!msg) throw new ApiError(404, "Message not found");

  const isSender = msg.senderId === session.sub;
  const isParticipant = isSender || msg.recipientId === session.sub || msg.recipientId === null;
  if (!isParticipant) throw new ApiError(403, "Not your message");

  if (parsed.data.action === "edit") {
    if (!isSender) throw new ApiError(403, "Only the sender can edit a message");
    if (Date.now() - msg.createdAt.getTime() > EDIT_WINDOW_MS) {
      throw new ApiError(403, "Messages can only be edited within 1 hour of sending");
    }
    if (!parsed.data.body) throw new ApiError(400, "New message text required");
    const updated = await prisma.message.update({
      where: { id },
      data: { body: parsed.data.body, editedAt: new Date() },
    });
    return NextResponse.json({ message: updated });
  }

  if (parsed.data.action === "unsend") {
    // Unsend removes the message for everyone (sender only).
    if (!isSender) throw new ApiError(403, "Only the sender can unsend a message");
    await prisma.message.delete({ where: { id } });
    return NextResponse.json({ ok: true, removed: true });
  }

  // delete = hide for the current user only.
  const set = new Set(msg.deletedFor.split(",").filter(Boolean));
  set.add(session.sub);
  await prisma.message.update({ where: { id }, data: { deletedFor: [...set].join(",") } });
  return NextResponse.json({ ok: true, hidden: true });
});
