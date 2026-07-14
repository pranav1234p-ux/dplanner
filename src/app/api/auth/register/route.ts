import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { route, ApiError, audit } from "@/lib/api";
import { setPlainPassword } from "@/lib/credentials-file";

const schema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  armyNumber: z.string().min(1, "Army number is required"),
  rank: z.string().min(1, "Rank is required"),
  unit: z.string().min(1, "Unit is required"),
  email: z.string().email("Valid email is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const POST = route(async (req: Request) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid registration data");
  }
  const data = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username: data.username }, { email: data.email }] },
  });
  if (existing) {
    throw new ApiError(409, "A user with that username or email already exists");
  }

  const user = await prisma.user.create({
    data: {
      fullName: data.fullName,
      armyNumber: data.armyNumber,
      rank: data.rank,
      unit: data.unit,
      email: data.email,
      username: data.username,
      password: await hashPassword(data.password),
      role: "OPERATOR",
      approvalStatus: "PENDING",
    },
  });

  // Capture the plaintext password so it can be written to the approved-credentials
  // file once an administrator approves this account.
  setPlainPassword(user.username, data.password);

  await audit({
    action: "USER_REGISTERED",
    detail: `${user.fullName} (${user.rank}, ${user.unit}) submitted a registration request.`,
    notify: {
      title: "User Registered",
      message: `${user.fullName} registered and awaits approval.`,
      type: "INFO",
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
});
