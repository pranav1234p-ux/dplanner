"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Plane,
  FileText,
  MapPin,
  Save,
  Trash2,
  Plus,
  Layers,
  Ruler,
  Ban,
  Crosshair,
  Clock,
  CalendarClock,
  Map as MapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, Textarea } from "@/components/ui/input";
import { DroneStatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { pathLength, formatDateTime, formatDuration } from "@/lib/utils";
import { useStickyMapLayer } from "@/lib/map-view";
import { MAP_LAYERS, type Waypoint, type Marking, type LatLng } from "./map-config";

const PlannerMap = dynamic(() => import("./planner-map"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-navy-900 text-sm text-slate-500">
      Loading tactical map…
    </div>
  ),
});

type Drone = { id: string; droneId: string; name: string; type: string; unit: string; status: string; latitude: number; longitude: number };

export function Planner({
  drones,
  markings,
  canCreate,
}: {
  drones: Drone[];
  markings: Marking[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const { push } = useToast();

  const [layer, setLayer] = useStickyMapLayer("planner");
  const [droneId, setDroneId] = React.useState("");
  const [waypoints, setWaypoints] = React.useState<Waypoint[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [manual, setManual] = React.useState({ lat: "", lng: "" });
  // Default flight parameters applied to each newly-added waypoint.
  const [defaults, setDefaults] = React.useState({ altitude: 100, speed: 12, hoverTime: 0 });

  const year = new Date().getFullYear();
  const [details, setDetails] = React.useState({
    missionName: "",
    missionCode: `MSN-${year}-${String(Math.floor(Math.random() * 900) + 100)}`,
    description: "",
    unit: "",
    flightDate: "",
    fromTime: "",
    toTime: "",
    notes: "",
  });

  // Combine the single date + from/to times into ISO timestamps for saving.
  const startISO = details.flightDate && details.fromTime ? `${details.flightDate}T${details.fromTime}` : "";
  const endISO = details.flightDate && details.toTime ? `${details.flightDate}T${details.toTime}` : "";

  const selectedDrone = drones.find((d) => d.id === droneId);
  const distance = pathLength(waypoints.map((w) => [w.lat, w.lng] as [number, number]));
  const scheduleSummary = startISO
    ? `${formatDateTime(startISO)}${endISO ? ` → ${formatDateTime(endISO)} · ${formatDuration(startISO, endISO)}` : ""}`
    : "Not scheduled";

  function addWaypoint(p: LatLng) {
    if (!canCreate) return;
    setWaypoints((w) => [...w, { ...p, ...defaults }]);
  }
  function addManual() {
    const lat = parseFloat(manual.lat);
    const lng = parseFloat(manual.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return push({ kind: "error", title: "Invalid coordinates" });
    addWaypoint({ lat, lng });
    setManual({ lat: "", lng: "" });
  }
  function updateWaypoint(i: number, patch: Partial<Waypoint>) {
    setWaypoints((w) => w.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function removeWaypoint(i: number) {
    setWaypoints((w) => w.filter((_, idx) => idx !== i));
  }

  function setD<K extends keyof typeof details>(k: K, v: string) {
    setDetails((d) => ({ ...d, [k]: v }));
  }

  async function save() {
    if (!droneId) return push({ kind: "error", title: "Select a drone first" });
    if (!details.missionName.trim()) return push({ kind: "error", title: "Mission name is required" });
    if (waypoints.length === 0) return push({ kind: "error", title: "Add at least one waypoint" });
    if (startISO && endISO && new Date(endISO) <= new Date(startISO))
      return push({ kind: "error", title: "To-time must be after from-time" });

    setSaving(true);
    const res = await fetch("/api/missions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        missionName: details.missionName,
        missionCode: details.missionCode,
        description: details.description,
        unit: details.unit,
        notes: details.notes,
        startTime: startISO || null,
        endTime: endISO || null,
        droneId,
        waypoints: waypoints.map((w) => ({
          latitude: w.lat,
          longitude: w.lng,
          altitude: w.altitude,
          speed: w.speed,
          hoverTime: w.hoverTime,
        })),
        mapObjects: [],
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return push({ kind: "error", title: "Save failed", message: data.error });
    push({ kind: "success", title: "Mission saved", message: `${details.missionCode} created as Planned` });
    router.push(`/missions/${data.mission.id}`);
  }

  const mapCenter: [number, number] = selectedDrone
    ? [selectedDrone.latitude, selectedDrone.longitude]
    : [22.9734, 78.6569];

  return (
    <div className="flex h-full flex-col">
      {/* Tab title — visible when the planner opens (sidebar is icon-only) */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-white/8 bg-navy-900/60 px-4">
        <MapIcon className="h-4 w-4 text-sky-400" />
        <h1 className="text-sm font-bold tracking-tight text-slate-100">Mission Planner</h1>
        <span className="hidden text-xs text-slate-500 sm:inline">— plan waypoints, schedule &amp; save a mission</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Map */}
        <div className="relative h-[45vh] flex-1 lg:h-auto">
        <PlannerMap
          layer={layer as keyof typeof MAP_LAYERS}
          waypoints={waypoints}
          shapes={[]}
          markings={markings}
          onAddWaypoint={addWaypoint}
          center={mapCenter}
          zoom={selectedDrone ? 11 : 5}
          interactive
          viewMemoryId="planner"
        />

        {/* Layer switcher */}
        <div className="absolute right-3 top-3 z-[500] panel flex items-center gap-1 p-1">
          <Layers className="ml-1 h-3.5 w-3.5 text-slate-400" />
          {Object.entries(MAP_LAYERS).map(([key, l]) => (
            <button
              key={key}
              onClick={() => setLayer(key as keyof typeof MAP_LAYERS)}
              className={`rounded px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-wider transition-colors ${
                layer === key ? "bg-sky-500/20 text-sky-300" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>

        {/* Readout */}
        <div className="absolute bottom-6 left-3 z-[500] panel flex items-center gap-4 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5 text-sky-300">
            <MapPin className="h-3.5 w-3.5" /> {waypoints.length} WP
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <Ruler className="h-3.5 w-3.5" /> {(distance / 1000).toFixed(2)} km
          </span>
          {markings.length > 0 && (
            <span className="flex items-center gap-1.5 text-red-300">
              <Ban className="h-3.5 w-3.5" /> {markings.length} zones
            </span>
          )}
          {canCreate && <span className="text-slate-500">Click map to drop waypoint</span>}
        </div>
      </div>

      {/* Side panel */}
      <aside className="w-full shrink-0 overflow-y-auto border-t border-white/8 bg-navy-900/60 lg:w-[380px] lg:border-l lg:border-t-0">
        {!canCreate ? (
          <div className="p-6 text-sm text-slate-400">
            <div className="panel p-4">
              <p className="font-semibold text-slate-200">Read-only map view</p>
              <p className="mt-1 text-xs text-slate-500">
                Your role has view-only access. No-fly zones are shown in red. Mission planning
                requires an Operator or Administrator account.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5 p-5">
            {/* Step 1 — Drone */}
            <section>
              <StepHeader n={1} icon={Plane} title="Select Drone" />
              <Select value={droneId} onChange={(e) => setDroneId(e.target.value)} className="mt-2">
                <option value="">— Choose a drone —</option>
                {drones.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.droneId} · {d.type}
                  </option>
                ))}
              </Select>
              {selectedDrone && (
                <div className="mt-2 rounded-lg border border-white/8 bg-navy-950/40 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{selectedDrone.name}</span>
                    <DroneStatusBadge status={selectedDrone.status} />
                  </div>
                  <p className="mt-1 text-slate-500">{selectedDrone.unit} · {selectedDrone.type}</p>
                </div>
              )}
            </section>

            {/* Step 2 — Details */}
            <section>
              <StepHeader n={2} icon={FileText} title="Mission Details" />
              <div className="mt-2 space-y-3">
                <Field label="Mission Name">
                  <Input value={details.missionName} onChange={(e) => setD("missionName", e.target.value)} placeholder="Perimeter Recon Delta" />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Mission ID">
                    <Input value={details.missionCode} onChange={(e) => setD("missionCode", e.target.value)} />
                  </Field>
                  <Field label="Unit">
                    <Input value={details.unit} onChange={(e) => setD("unit", e.target.value)} placeholder="5 Aviation Sqn" />
                  </Field>
                </div>
                <Field label="Description">
                  <Textarea value={details.description} onChange={(e) => setD("description", e.target.value)} placeholder="Objective & scope…" />
                </Field>
              </div>
            </section>

            {/* Step 3 — Flight Schedule */}
            <section>
              <StepHeader n={3} icon={CalendarClock} title="Flight Schedule" />
              <p className="mt-1 text-[0.7rem] text-slate-500">
                Pick the flight date and the from / to time window.
              </p>
              <div className="mt-2 space-y-2">
                <Field label="Flight Date">
                  <Input type="date" value={details.flightDate} onChange={(e) => setD("flightDate", e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="From Time">
                    <Input type="time" value={details.fromTime} onChange={(e) => setD("fromTime", e.target.value)} />
                  </Field>
                  <Field label="To Time">
                    <Input type="time" value={details.toTime} onChange={(e) => setD("toTime", e.target.value)} />
                  </Field>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-white/8 bg-navy-950/40 px-3 py-2 text-xs">
                <Clock className="h-3.5 w-3.5 text-sky-400" />
                <span className="text-slate-500">Flight window:</span>
                <span className="font-medium text-slate-200">{scheduleSummary}</span>
              </div>
            </section>

            {/* Step 4 — Waypoints */}
            <section>
              <StepHeader n={4} icon={MapPin} title="Waypoints" />

              {/* Default flight parameters for new waypoints */}
              <div className="mt-2 rounded-lg border border-white/8 bg-navy-950/40 p-3">
                <p className="mb-2 text-[0.62rem] font-semibold uppercase tracking-wider text-slate-500">
                  Default drone parameters (applied to new waypoints)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <MiniField label="Altitude (m)" value={defaults.altitude} onChange={(v) => setDefaults((d) => ({ ...d, altitude: v }))} />
                  <MiniField label="Speed (m/s)" value={defaults.speed} onChange={(v) => setDefaults((d) => ({ ...d, speed: v }))} />
                  <MiniField label="Hover (s)" value={defaults.hoverTime} onChange={(v) => setDefaults((d) => ({ ...d, hoverTime: v }))} />
                </div>
              </div>

              <div className="mt-2 flex items-end gap-2">
                <Field label="Lat"><Input value={manual.lat} onChange={(e) => setManual((m) => ({ ...m, lat: e.target.value }))} placeholder="28.61" /></Field>
                <Field label="Lng"><Input value={manual.lng} onChange={(e) => setManual((m) => ({ ...m, lng: e.target.value }))} placeholder="77.20" /></Field>
                <Button variant="secondary" size="md" onClick={addManual} className="mb-0"><Plus className="h-4 w-4" /></Button>
              </div>

              <div className="mt-3 space-y-2">
                {waypoints.map((w, i) => (
                  <div key={i} className="rounded-lg border border-white/8 bg-navy-950/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-semibold text-sky-300">
                        <Crosshair className="h-3.5 w-3.5" /> WP {i + 1}
                        <span className="font-mono text-[0.68rem] text-slate-500">
                          {w.lat.toFixed(4)}, {w.lng.toFixed(4)}
                        </span>
                      </span>
                      <button onClick={() => removeWaypoint(i)} className="text-slate-500 hover:text-red-300">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <MiniField label="Alt (m)" value={w.altitude} onChange={(v) => updateWaypoint(i, { altitude: v })} />
                      <MiniField label="Spd (m/s)" value={w.speed} onChange={(v) => updateWaypoint(i, { speed: v })} />
                      <MiniField label="Hover (s)" value={w.hoverTime} onChange={(v) => updateWaypoint(i, { hoverTime: v })} />
                    </div>
                  </div>
                ))}
                {waypoints.length === 0 && (
                  <p className="rounded-lg border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">
                    Click on the map or enter coordinates to add waypoints.
                  </p>
                )}
              </div>
            </section>

            <Field label="Mission Notes">
              <Textarea value={details.notes} onChange={(e) => setD("notes", e.target.value)} placeholder="Operational notes, ROE, contingencies…" />
            </Field>

            <Button onClick={save} loading={saving} size="lg" className="w-full justify-center">
              <Save className="h-4 w-4" /> Save Mission (Planned)
            </Button>
          </div>
        )}
      </aside>
      </div>
    </div>
  );
}

function StepHeader({ n, icon: Icon, title }: { n: number; icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-sky-500/15 text-[0.7rem] font-bold text-sky-300">
        {n}
      </span>
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h3>
    </div>
  );
}

function MiniField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.6rem] uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-8 w-full rounded-md border border-white/10 bg-navy-950/60 px-2 text-xs text-slate-100 focus:border-sky-500/40 focus:outline-none"
      />
    </label>
  );
}
