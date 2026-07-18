import { NextResponse } from "next/server";
import { route, requirePermission, ApiError } from "@/lib/api";
import { DETECTION_SERVICE_URL } from "@/lib/detection";

export const dynamic = "force-dynamic";

/** Proxies a single frame to the Python sidecar for inference. Proxying (rather
 *  than letting the browser call the sidecar directly) keeps the service URL
 *  server-side and puts detection behind the app's own auth + RBAC. */
export const POST = route(async (req: Request) => {
  await requirePermission("detection.run");

  const form = await req.formData();
  const frame = form.get("frame");
  if (!(frame instanceof Blob)) throw new ApiError(400, "No frame supplied");

  const upstream = new FormData();
  upstream.append("frame", frame, "frame.jpg");
  upstream.append("conf", String(form.get("conf") ?? "0.3"));
  upstream.append("iou", String(form.get("iou") ?? "0.5"));
  const models = form.get("models");
  if (typeof models === "string" && models) upstream.append("models", models);

  let res: Response;
  try {
    res = await fetch(`${DETECTION_SERVICE_URL}/detect`, {
      method: "POST",
      body: upstream,
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new ApiError(503, "Detection service is not running");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.detail ?? "Detection failed");
  }
  return NextResponse.json(data);
});
