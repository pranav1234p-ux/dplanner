// Connection details for the Python detection sidecar (drone-detection-service).
// Kept server-side: the browser only ever talks to /api/detection/*.
export const DETECTION_SERVICE_URL =
  process.env.DETECTION_SERVICE_URL ?? "http://127.0.0.1:8008";

export type DetectionBox = {
  x: number; // all normalised 0..1 against the frame
  y: number;
  w: number;
  h: number;
  confidence: number;
  label: string;
  track_id: number | null;
};

export type DetectResult = {
  detections: DetectionBox[];
  inference_ms: number;
  width: number;
  height: number;
};
