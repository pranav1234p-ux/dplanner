import { NextResponse } from "next/server";
import { route, requireSession } from "@/lib/api";
import { DETECTION_SERVICE_URL } from "@/lib/detection";

export const dynamic = "force-dynamic";

/** Is the Python detection sidecar up and has it loaded the model? */
export const GET = route(async () => {
  await requireSession();
  try {
    const res = await fetch(`${DETECTION_SERVICE_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      return NextResponse.json({ status: "down", error: `Service returned ${res.status}` });
    }
    return NextResponse.json(await res.json());
  } catch {
    // The sidecar is a separate process the user starts; being off is normal.
    return NextResponse.json({
      status: "down",
      error: "Detection service is not running",
    });
  }
});
