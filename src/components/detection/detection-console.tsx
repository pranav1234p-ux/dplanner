"use client";
import * as React from "react";
import { Camera, Play, Square, Radar, Upload, RefreshCw, Move, Volume2, VolumeX, Trophy, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { DetectResult, ModelResult } from "@/lib/detection";

type Source = "CAMERA" | "VIDEO";
type ModelHealth = { id: string; label: string; loaded: boolean; error?: string | null };
type Health = { status: string; models?: ModelHealth[]; device?: string; error?: string | null };

// Per-model display: a short name and a distinct box/accent colour so the two
// models' detections are told apart on the same frame.
const MODEL_META: Record<string, { short: string; color: string }> = {
  "drone-3class": { short: "3-class", color: "#38bdf8" },
  "drone-single": { short: "single", color: "#fb923c" },
};
const FALLBACK_COLORS = ["#38bdf8", "#fb923c", "#4ade80", "#f472b6"];
const modelColor = (id: string, i: number) => MODEL_META[id]?.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
const modelShort = (id: string) => MODEL_META[id]?.short ?? id;

type Tally = { frames: number; droneFrames: number; confSum: number; confN: number; msSum: number };

const droneDets = (r: ModelResult) => r.detections.filter((d) => d.label === "drone");
const maxConf = (r: ModelResult) => droneDets(r).reduce((m, d) => Math.max(m, d.confidence), 0);

// The model that has a dedicated 'bird' class. Its verdict drives the alarm and
// the live class counts, so a correctly-identified bird never triggers a beep.
// (The single-class model labels everything 'drone', so it can't tell them apart.)
const BIRD_AWARE_MODEL = "drone-3class";
const CLASS_COUNTS = [
  { key: "drone", label: "Drones", color: "#38bdf8" },
  { key: "bird", label: "Birds", color: "#facc15" },
  { key: "airplane", label: "Aircraft", color: "#a78bfa" },
] as const;

type CtrlTab = "model" | "compare" | "service" | "alert";
const CTRL_TABS: { id: CtrlTab; label: string; icon: typeof Layers }[] = [
  { id: "model", label: "Model", icon: Layers },
  { id: "compare", label: "Compare", icon: Trophy },
  { id: "service", label: "Service", icon: Radar },
  { id: "alert", label: "Alert", icon: Volume2 },
];

export function DetectionConsole({ canRun }: { canRun: boolean }) {
  const { push } = useToast();
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const grabRef = React.useRef<HTMLCanvasElement | null>(null);
  const runningRef = React.useRef(false);

  const [source, setSource] = React.useState<Source>("CAMERA");
  const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = React.useState("");
  const [connected, setConnected] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [health, setHealth] = React.useState<Health | null>(null);
  const [conf, setConf] = React.useState(0.3);
  const [results, setResults] = React.useState<ModelResult[]>([]);
  const [tally, setTally] = React.useState<Record<string, Tally>>({});
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);

  // Which model(s) to run: "both" (compare) or a single model id. Mirrored to a
  // ref so switching mid-detection takes effect on the next frame.
  const [modelChoice, setModelChoice] = React.useState("both");
  const [ctrlTab, setCtrlTab] = React.useState<CtrlTab>("model");
  const modelChoiceRef = React.useRef(modelChoice);
  React.useEffect(() => {
    modelChoiceRef.current = modelChoice;
  }, [modelChoice]);

  // --- audio alarm (beep on drone) ------------------------------------------
  const [alarmOn, setAlarmOn] = React.useState(true);
  const [volume, setVolume] = React.useState(0.5);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const lastBeepRef = React.useRef(0);
  const alarmOnRef = React.useRef(alarmOn);
  const volumeRef = React.useRef(volume);
  React.useEffect(() => {
    alarmOnRef.current = alarmOn;
  }, [alarmOn]);
  React.useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  function ensureAudio(): AudioContext | null {
    try {
      if (!audioCtxRef.current) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new Ctor();
      }
      if (audioCtxRef.current.state === "suspended") void audioCtxRef.current.resume();
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }

  function beep() {
    const ctx = ensureAudio();
    if (!ctx) return;
    const v = Math.max(0, Math.min(1, volumeRef.current));
    if (v <= 0) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(v, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  function alertOnDrone(hasDrone: boolean) {
    if (!hasDrone || !alarmOnRef.current) return;
    const now = performance.now();
    if (now - lastBeepRef.current < 900) return;
    lastBeepRef.current = now;
    beep();
  }

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

    // A paused or finished recorded video keeps its last frame, which would
    // otherwise be re-detected forever (and keep the alarm beeping). Idle
    // instead — no inference, no beep — and keep the loop alive so detection
    // resumes when the video plays again. A live camera never reports these.
    if (video.paused || video.ended) {
      await new Promise((r) => setTimeout(r, 200));
      return true;
    }

    const grab = (grabRef.current ??= document.createElement("canvas"));
    grab.width = video.videoWidth;
    grab.height = video.videoHeight;
    grab.getContext("2d")!.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((r) => grab.toBlob(r, "image/jpeg", 0.8));
    if (!blob) return false;

    const form = new FormData();
    form.append("frame", blob, "frame.jpg");
    form.append("conf", String(conf));
    if (modelChoiceRef.current !== "both") form.append("models", modelChoiceRef.current);

    const res = await fetch("/api/detection/detect", { method: "POST", body: form });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      push({ kind: "error", title: "Detection failed", message: data?.error });
      return false;
    }
    const result = data as DetectResult;
    setResults(result.results);

    // Alarm on drones only — use the bird-aware model when it's running so a
    // correctly-identified bird never beeps. Fall back to whatever ran otherwise.
    const alarmSrc = result.results.find((r) => r.model === BIRD_AWARE_MODEL) ?? result.results[0];
    alertOnDrone(!!alarmSrc && droneDets(alarmSrc).length > 0);

    // Running tally so we can say which model detects drones more often/confidently.
    setTally((prev) => {
      const next: Record<string, Tally> = { ...prev };
      for (const r of result.results) {
        const drones = droneDets(r);
        const t = next[r.model] ? { ...next[r.model] } : { frames: 0, droneFrames: 0, confSum: 0, confN: 0, msSum: 0 };
        t.frames += 1;
        if (drones.length) t.droneFrames += 1;
        for (const d of drones) {
          t.confSum += d.confidence;
          t.confN += 1;
        }
        t.msSum += r.inference_ms;
        next[r.model] = t;
      }
      return next;
    });
    return true;
  }

  async function loop() {
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
    ensureAudio(); // unlock audio within the user gesture
    setTally({}); // fresh comparison per run
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
    setResults([]);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
    }
  }

  // --- overlay (both models, distinct colours) ------------------------------
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
    results.forEach((r, i) => {
      const color = modelColor(r.model, i);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      // Nest each model's boxes slightly so overlapping detections stay visible,
      // and stack labels so they don't collide.
      const inset = i * 3;
      for (const b of r.detections) {
        const x = b.x * canvas.width + inset;
        const y = b.y * canvas.height + inset;
        const w = b.w * canvas.width - 2 * inset;
        const h = b.h * canvas.height - 2 * inset;
        ctx.strokeRect(x, y, w, h);
        const tag = `${modelShort(r.model)} ${b.label} ${(b.confidence * 100).toFixed(0)}%`;
        ctx.fillText(tag, x, Math.max(12, y - 4 - i * 14));
      }
    });
  }, [results]);

  const ready = health?.status === "ready";

  // Live class counts for the current frame, from the bird-aware model when it's
  // running (it's the only one that can report birds/aircraft).
  const countSrc = results.find((r) => r.model === BIRD_AWARE_MODEL) ?? results[0];
  const liveCounts: Record<string, number> = { drone: 0, bird: 0, airplane: 0 };
  for (const d of countSrc?.detections ?? []) {
    if (d.label in liveCounts) liveCounts[d.label] += 1;
  }

  // Per-frame comparison for the live badge.
  const frameSummary = results.map((r, i) => ({
    model: r.model,
    color: modelColor(r.model, i),
    drones: droneDets(r).length,
    maxConf: maxConf(r),
    ms: r.inference_ms,
  }));
  const anyDrone = frameSummary.some((s) => s.drones > 0);
  const frameWinner = anyDrone
    ? frameSummary.reduce((best, s) =>
        s.drones !== best.drones ? (s.drones > best.drones ? s : best) : s.maxConf > best.maxConf ? s : best,
      )
    : null;

  // Session verdict: which model found drones in more frames (tiebreak avg conf).
  const tallyRows = Object.entries(tally).map(([model, t], i) => ({
    model,
    color: modelColor(model, i),
    hitRate: t.frames ? t.droneFrames / t.frames : 0,
    avgConf: t.confN ? t.confSum / t.confN : 0,
    avgMs: t.frames ? t.msSum / t.frames : 0,
    droneFrames: t.droneFrames,
    frames: t.frames,
  }));
  const verdict =
    tallyRows.length > 1
      ? tallyRows.reduce((best, r) =>
          r.hitRate !== best.hitRate ? (r.hitRate > best.hitRate ? r : best) : r.avgConf > best.avgConf ? r : best,
        )
      : null;

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
            onLoadedMetadata={() => setResults([])}
          />
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
          {!connected && !videoUrl && (
            <div className="absolute inset-0 grid place-items-center text-xs text-slate-500">
              Connect a camera or load a recorded video
            </div>
          )}
          {/* Live per-model tally on the frame */}
          {frameSummary.length > 0 && (
            <div className="panel absolute left-3 top-3 space-y-1 px-2.5 py-1.5 font-mono text-[0.66rem]">
              {frameSummary.map((s) => (
                <div key={s.model} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                  <span className="text-slate-300">{modelShort(s.model)}</span>
                  <span className={s.drones ? "text-slate-100" : "text-slate-500"}>
                    {s.drones} drone{s.drones === 1 ? "" : "s"}
                  </span>
                  {s.drones > 0 && <span className="text-slate-400">{(s.maxConf * 100).toFixed(0)}%</span>}
                  <span className="text-slate-600">{s.ms}ms</span>
                  {frameWinner?.model === s.model && <Trophy className="h-3 w-3 text-amber-300" />}
                </div>
              ))}
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

        {/* Live class counts for the current frame */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {CLASS_COUNTS.map((c) => (
            <div key={c.key} className="panel px-3 py-2 text-center">
              <div className="font-mono text-2xl font-bold leading-none" style={{ color: c.color }}>
                {liveCounts[c.key]}
              </div>
              <div className="mt-1 text-[0.6rem] uppercase tracking-wider text-slate-500">{c.label}</div>
            </div>
          ))}
        </div>
        {countSrc && countSrc.model !== BIRD_AWARE_MODEL && (
          <p className="mt-1.5 text-[0.62rem] text-slate-500">
            Single-class model only reports drones — switch to the 3-class or Both to count birds &amp; aircraft.
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Model / Compare / Service / Alert — collapsed into square tabs */}
        <div className="panel p-4">
          <div className="grid grid-cols-4 gap-1.5">
            {CTRL_TABS.map((t) => {
              const Icon = t.icon;
              const active = ctrlTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCtrlTab(t.id)}
                  className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-[0.56rem] font-semibold uppercase tracking-wide transition-colors ${
                    active
                      ? "border-sky-500/50 bg-sky-500/10 text-sky-200"
                      : "border-white/10 text-slate-400 hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                  {t.id === "service" && (
                    <span className={`h-1.5 w-1.5 rounded-full ${ready ? "bg-sky-400" : "bg-red-400"}`} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            {ctrlTab === "model" && (
              <>
                <Select
                  value={modelChoice}
                  onChange={(e) => {
                    setModelChoice(e.target.value);
                    setResults([]);
                    setTally({});
                  }}
                >
                  <option value="both">Both (run side by side)</option>
                  {(health?.models ?? []).map((m) => (
                    <option key={m.id} value={m.id} disabled={!m.loaded}>
                      {m.label}
                      {m.loaded ? "" : " (unavailable)"}
                    </option>
                  ))}
                </Select>
                <p className="mt-2 text-[0.64rem] text-slate-500">
                  {modelChoice === "both"
                    ? "Both models run each frame — slower, but you can compare them."
                    : "Only the selected model runs — faster."}
                </p>
              </>
            )}

            {ctrlTab === "compare" && (
              tallyRows.length === 0 ? (
                <p className="text-[0.68rem] text-slate-500">
                  {modelChoice === "both"
                    ? "Run detection to compare the two models."
                    : "Run detection to see model stats."}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {tallyRows.map((r) => (
                    <div key={r.model} className="text-[0.7rem]">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />
                        <span className="font-semibold text-slate-200">{modelShort(r.model)}</span>
                        {verdict?.model === r.model && (
                          <span className="ml-auto flex items-center gap-1 text-[0.62rem] font-semibold uppercase tracking-wider text-amber-300">
                            <Trophy className="h-3 w-3" /> best
                          </span>
                        )}
                      </div>
                      <div className="mt-1 grid grid-cols-3 gap-1 font-mono text-[0.64rem] text-slate-400">
                        <span>
                          <span className="text-slate-500">hit </span>
                          {(r.hitRate * 100).toFixed(0)}%
                        </span>
                        <span>
                          <span className="text-slate-500">conf </span>
                          {(r.avgConf * 100).toFixed(0)}%
                        </span>
                        <span>
                          <span className="text-slate-500">~ </span>
                          {r.avgMs.toFixed(0)}ms
                        </span>
                      </div>
                      <div className="mt-0.5 text-[0.6rem] text-slate-600">
                        drones in {r.droneFrames}/{r.frames} frames
                      </div>
                    </div>
                  ))}
                  {verdict && (
                    <p className="border-t border-white/8 pt-2 text-[0.64rem] text-slate-400">
                      <span className="font-semibold text-amber-300">{modelShort(verdict.model)}</span> is detecting
                      drones more reliably this session.
                    </p>
                  )}
                </div>
              )
            )}

            {ctrlTab === "service" && (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${ready ? "bg-sky-400" : "bg-red-400"}`} />
                    <span className="text-slate-300">{ready ? "Ready" : "Offline"}</span>
                  </span>
                  <button
                    onClick={checkHealth}
                    className="text-slate-500 hover:text-sky-300"
                    aria-label="Recheck service"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  {(health?.models ?? []).map((m, i) => (
                    <div key={m.id} className="flex items-center gap-2 text-[0.66rem]">
                      <span className="h-2 w-2 rounded-sm" style={{ background: modelColor(m.id, i) }} />
                      <span className="text-slate-400">{m.label}</span>
                      <span className={m.loaded ? "ml-auto text-sky-300" : "ml-auto text-red-300"}>
                        {m.loaded ? "loaded" : "error"}
                      </span>
                    </div>
                  ))}
                </div>
                {health?.error && <p className="mt-2 text-[0.68rem] text-red-300">{health.error}</p>}
              </>
            )}

            {ctrlTab === "alert" && (
              <>
                <label className="flex cursor-pointer items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-2">
                    {alarmOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                    Beep on drone
                  </span>
                  <input
                    type="checkbox"
                    checked={alarmOn}
                    onChange={(e) => setAlarmOn(e.target.checked)}
                    className="h-4 w-4 accent-sky-400"
                  />
                </label>
                <div className="mt-3 flex items-center gap-2">
                  <span className="w-12 text-[0.66rem] uppercase tracking-wider text-slate-500">
                    Vol {Math.round(volume * 100)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    disabled={!alarmOn}
                    className="flex-1 accent-sky-400 disabled:opacity-40"
                    aria-label="Alert volume"
                  />
                  <button
                    type="button"
                    onClick={beep}
                    className="rounded-md border border-white/15 px-2 py-1 text-[0.66rem] text-slate-300 hover:border-sky-500/40 hover:text-sky-300"
                  >
                    Test
                  </button>
                </div>
              </>
            )}
          </div>
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
          <p className="text-[0.66rem] text-amber-300">Your role can view this console but not run detection.</p>
        )}
      </div>
    </div>
  );
}
