import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";
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
