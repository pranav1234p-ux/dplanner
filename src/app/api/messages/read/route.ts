import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, requireSession } from "@/lib/api";

const schema = z.object({ fromUserId: z.string() });

export const POST = route(async (req: Request) => {
  const session = await requireSession();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await prisma.message.updateMany({
    where: { senderId: parsed.data.fromUserId, recipientId: session.sub, read: false },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
});
