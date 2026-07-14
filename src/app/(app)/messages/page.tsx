import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { MessagingCenter } from "@/components/messages/messaging-center";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = (await getSession())!;
  return (
    <div>
      <PageHeader title="Free Text Message" subtitle="Direct messages between personnel" />
      <div className="p-6">
        <MessagingCenter isAdmin={session.role === "ADMIN"} />
      </div>
    </div>
  );
}
