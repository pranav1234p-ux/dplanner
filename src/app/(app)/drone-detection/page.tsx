import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { DetectionConsole } from "@/components/detection/detection-console";

export const dynamic = "force-dynamic";

export default async function DroneDetectionPage() {
  const session = (await getSession())!;
  return (
    <div>
      <PageHeader title="Drone Detection" subtitle="YOLOv11n detection (drone / bird / airplane) on a live camera or recorded video" />
      <div className="p-6">
        <DetectionConsole canRun={can(session.role, "detection.run")} />
      </div>
    </div>
  );
}
