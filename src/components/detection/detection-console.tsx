"use client";
import * as React from "react";
import { Camera, Video, Play, Square, Radar, Upload, RefreshCw, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { DetectResult, DetectionBox } from "@/lib/detection";

type Source = "CAMERA" | "VIDEO";
type Health = { status: string; model?: string; device?: string; error?: string | null };

// Falls back to the sky accent for any label the map doesn't know about (e.g. a
// future model trained with different classes).
const BOX_COLORS: Record<string, string> = {
  drone: "#38bdf8",
  bird: "#facc15",
  airplane: "#a78bfa",
};
const boxColor = (label: string) => BOX_COLORS[label] ?? "#38bdf8";

export function DetectionConsole({ canRun }: { canRun: boolean }) {
  const { push } = useToast();
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const grabRef = React.useRef<HTMLCanvasElement | null>(null);
  // Read inside the detect loop without restarting it on every toggle.
  const runningRef = React.useRef(false);

  const [source, setSource] = React.useState<Source>("CAMERA");
  const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = React.useState("");
  const [connected, setConnected] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [health, setHealth] = React.useState<Health | null>(null);
  const [conf, setConf] = React.useState(0.3);
  const [boxes, setBoxes] = React.useState<DetectionBox[]>([]);
  const [stats, setStats] = React.useState<{ ms: number; count: number } | null>(null);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);

  // --- service health ---------------------------------------------------------
  const checkHealth = React.useCallback(async () => {
    try {
      const res = await fetch("/api/detection/health", { cache: "no-store" });
      setHealth(await res.json());
    } catch {
      setHealth({ status: "down", error: "Could not reach the app API" });
    }
  }, []);

  React.useEffect(() => {
    checkHealth();
    const t = setInterval(checkHealth, 15_000);
    return () => clearInterval(t);
  }, [checkHealth]);

  // --- camera ---------------------------------------------------------------
  async function listDevices() {
    const all = await navigator.mediaDevices.enumerateDevices();
    const cams = all.filter((d) => d.kind === "videoinput");
    setDevices(cams);
    if (cams.length && !deviceId) setDeviceId(cams[0].deviceId);
    return cams;
  }

  async function connectCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setConnected(true);
      // Labels are only exposed once permission is granted.
      await listDevices();
      push({ kind: "success", title: "Camera connected" });
    } catch (err) {
      push({
        kind: "error",
        title: "Could not connect camera",
        message: err instanceof Error ? err.message : undefined,
      });
    }
  }

  function disconnectCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setConnected(false);
    stop();
  }

  React.useEffect(() => {
    listDevices().catch(() => {});
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- detection loop -------------------------------------------------------
  async function detectFrame(): Promise<boolean> {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return false;

    const grab = (grabRef.current ??= document.createElement("canvas"));
    grab.width = video.videoWidth;
    grab.height = video.videoHeight;
    grab.getContext("2d")!.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((r) => grab.toBlob(r, "image/jpeg", 0.8));
    if (!blob) return false;

    const form = new FormData();
    form.append("frame", blob, "frame.jpg");
    form.append("conf", String(conf));

    const res = await fetch("/api/detection/detect", { method: "POST", body: form });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      push({ kind: "error", title: "Detection failed", message: data?.error });
      return false;
    }
    const result = data as DetectResult;
    setBoxes(result.detections);
    setStats({ ms: result.inference_ms, count: result.detections.length });
    return true;
  }

  async function loop() {
    // Sequential, not on a timer: even the fast model takes real time per
    // frame on this machine's CPU, so overlapping requests would just queue up
    // and lag further behind.
    while (runningRef.current) {
      const ok = await detectFrame();
      if (!ok) break;
    }
    runningRef.current = false;
    setRunning(false);
  }

  function start() {
    if (!videoRef.current?.videoWidth) {
      return push({ kind: "error", title: "No video source", message: "Connect a camera or load a video first." });
    }
    runningRef.current = true;
    setRunning(true);
    loop();
  }

  function stop() {
    runningRef.current = false;
    setRunning(false);
  }

  // --- recorded video -------------------------------------------------------
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    stop();
    disconnectCamera();
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setBoxes([]);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
    }
  }

  // --- overlay --------------------------------------------------------------
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.font = "12px ui-monospace, monospace";
    for (const b of boxes) {
      const color = boxColor(b.label);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      const x = b.x * canvas.width;
      const y = b.y * canvas.height;
      const w = b.w * canvas.width;
      const h = b.h * canvas.height;
      ctx.strokeRect(x, y, w, h);
      const tag = `${b.label} ${(b.confidence * 100).toFixed(0)}%${b.track_id ? ` #${b.track_id}` : ""}`;
      ctx.fillText(tag, x, Math.max(12, y - 4));
    }
  }, [boxes]);

  const ready = health?.status === "ready";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Feed */}
      <div className="lg:col-span-2">
        <div className="relative aspect-video overflow-hidden rounded-lg border border-white/8 bg-navy-950">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            className="h-full w-full object-contain"
            playsInline
            muted
            controls={source === "VIDEO" && !!videoUrl}
            onLoadedMetadata={() => setBoxes([])}
          />
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
          {!connected && !videoUrl && (
            <div className="absolute inset-0 grid place-items-center text-xs text-slate-500">
              Connect a camera or load a recorded video
            </div>
          )}
          {stats && (
            <div className="panel absolute left-3 top-3 flex items-center gap-3 px-2.5 py-1 font-mono text-[0.68rem] text-slate-300">
              <span className={stats.count ? "text-sky-300" : "text-slate-500"}>
                {stats.count} detection{stats.count === 1 ? "" : "s"}
              </span>
              <span className="text-slate-500">{stats.ms} ms/frame</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {running ? (
            <Button onClick={stop} variant="danger" className="justify-center">
              <Square className="h-4 w-4" /> Stop Detection
            </Button>
          ) : (
            <Button onClick={start} disabled={!canRun || !ready} className="justify-center">
              <Play className="h-4 w-4" /> Start Detection
            </Button>
          )}
          <span className="text-[0.68rem] uppercase tracking-wider text-slate-500">
            Confidence {conf.toFixed(2)}
          </span>
          <input
            type="range"
            min={0.05}
            max={0.9}
            step={0.05}
            value={conf}
            onChange={(e) => setConf(Number(e.target.value))}
            className="w-32 accent-sky-400"
            aria-label="Confidence threshold"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <div className="panel p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Radar className="h-3.5 w-3.5" /> Detection Service
          </h3>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${ready ? "bg-sky-400" : health?.status === "loading" ? "bg-amber-400" : "bg-red-400"}`}
              />
              <span className="text-slate-300">
                {ready ? "Ready" : health?.status === "loading" ? "Loading model…" : "Offline"}
              </span>
            </span>
            <button onClick={checkHealth} className="text-slate-500 hover:text-sky-300" aria-label="Recheck service">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
          {health?.model && <p className="mt-2 font-mono text-[0.68rem] text-slate-500">{health.model}</p>}
          {health?.error && <p className="mt-2 text-[0.68rem] text-red-300">{health.error}</p>}
        </div>

        <div className="panel p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-300">Source</h3>
          <Select value={source} onChange={(e) => setSource(e.target.value as Source)}>
            <option value="CAMERA">Live camera</option>
            <option value="VIDEO">Recorded video</option>
          </Select>

          {source === "CAMERA" ? (
            <div className="mt-3 space-y-2">
              <Select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} disabled={connected}>
                {devices.length === 0 && <option value="">No cameras found</option>}
                {devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </Select>
              {connected ? (
                <Button variant="secondary" onClick={disconnectCamera} className="w-full justify-center">
                  Disconnect
                </Button>
              ) : (
                <Button onClick={connectCamera} className="w-full justify-center">
                  <Camera className="h-4 w-4" /> Attach &amp; Connect
                </Button>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 px-3 py-4 text-xs text-slate-400 hover:border-sky-500/40 hover:text-sky-300">
                <Upload className="h-4 w-4" />
                {videoUrl ? "Choose a different video" : "Choose a video file"}
                <input type="file" accept="video/*" className="hidden" onChange={onFile} />
              </label>
              <p className="mt-2 text-[0.66rem] text-slate-500">
                Play the video and start detection — frames are read as it plays.
              </p>
            </div>
          )}
        </div>

        <div className="panel p-4">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Move className="h-3.5 w-3.5" /> PTZ Control
          </h3>
          <p className="text-[0.66rem] leading-relaxed text-slate-500">
            Not configured. PTZ needs an ONVIF/RTSP camera — its address and credentials are set
            on the detection service, not in the browser.
          </p>
        </div>

        {!canRun && (
          <p className="text-[0.66rem] text-amber-300">
            Your role can view this console but not run detection.
          </p>
        )}
      </div>
    </div>
  );
}
