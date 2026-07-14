import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notificationScope } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { NotificationCenter, type Note } from "@/components/notifications/notification-center";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = (await getSession())!;
  const rows = await prisma.notification.findMany({
    where: notificationScope(session.sub, session.role),
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const notes: Note[] = rows.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader title="Notification Center" subtitle="System events and mission updates" />
      <div className="p-6">
        <NotificationCenter initial={notes} />
      </div>
    </div>
  );
}
