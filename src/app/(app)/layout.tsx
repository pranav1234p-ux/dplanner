import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notificationScope } from "@/lib/api";
import { AppShell, type SessionUser } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [unreadCount, unreadMessages] = await Promise.all([
    prisma.notification.count({ where: { read: false, ...notificationScope(session.sub, session.role) } }),
    prisma.message.count({
      where: { read: false, recipientId: session.sub },
    }),
  ]);

  const user: SessionUser = {
    id: session.sub,
    username: session.username,
    fullName: session.fullName,
    role: session.role,
    unit: session.unit,
  };

  return (
    <AppShell user={user} unreadCount={unreadCount} unreadMessages={unreadMessages}>
      {children}
    </AppShell>
  );
}
