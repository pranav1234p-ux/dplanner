"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Spline, Circle as CircleIcon, Square, Hexagon, Undo2, Save, Trash2, PencilRuler, Plus, X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { haversine } from "@/lib/utils";
import { MARKING_CATEGORIES, MARKING_CATEGORY_META, type MarkingCategory } from "@/lib/constants";
import { markingColor, type Marking } from "@/components/planner/map-config";
import { LayerSwitcher } from "@/components/planner/layer-switcher";

type OwnedMarking = Marking & { createdById?: string | null };

const MarkingMap = dynamic(() => import("./marking-map"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center bg-navy-900 text-xs text-slate-500">Loading map…</div>,
});

const SHAPE_TOOLS = [
  { key: "marker", label: "Marker", icon: MapPin, hint: "Click a point (choose a colour)" },
  { key: "line", label: "Line", icon: Spline, hint: "Click 2 or more points" },
  { key: "circle", label: "Circle", icon: CircleIcon, hint: "Click center, then edge" },
  { key: "rectangle", label: "Rectangle", icon: Square, hint: "Click 2 opposite corners" },
  { key: "polygon", label: "Polygon", icon: Hexagon, hint: "Click 3 or more points" },
] as const;

// Preset colour codes offered when placing markers.
const MARKER_COLORS = ["#38bdf8", "#4ade80", "#facc15", "#f472b6", "#a78bfa", "#fb923c", "#ef4444", "#ffffff"];

export function MarkingManager({
  initial,
  canManage,
  currentUserId,
  currentUserName,
  isAdmin,
}: {
  initial: OwnedMarking[];
  canManage: boolean;
  currentUserId: string;
  currentUserName: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [markings, setMarkings] = React.useState<OwnedMarking[]>(initial);
  const [layer, setLayer] = React.useState("tactical");
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const focused = markings.find((m) => m.id === focusId) ?? null;
  const [shape, setShape] = React.useState<(typeof SHAPE_TOOLS)[number]["key"]>("polygon");
  const [category, setCategory] = React.useState<MarkingCategory>("NO_FLY");
  const [name, setName] = React.useState("");
  const [customColor, setCustomColor] = React.useState("#38bdf8");
  const [notes, setNotes] = React.useState("");
  const [draft, setDraft] = React.useState<[number, number][]>([]);
  const [saving, setSaving] = React.useState(false);
  const [manualPt, setManualPt] = React.useState({ lat: "", lng: "" });
  const [radiusKm, setRadiusKm] = React.useState("");

  // Markers always use the chosen colour code; zones follow their category colour.
  const effectiveColor = shape === "marker" ? customColor : markingColor({ category, color: customColor });
  const showColorPicker = shape === "marker" || category === "CUSTOM";
  const tool = SHAPE_TOOLS.find((t) => t.key === shape)!;

  function addPoint(p: [number, number]) {
    if (!canManage) return;
    // A marker is a single point — replace rather than append.
    setDraft((d) => (shape === "marker" ? [p] : [...d, p]));
  }

  function addManualPoint() {
    const lat = parseFloat(manualPt.lat);
    const lng = parseFloat(manualPt.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return push({ kind: "error", title: "Invalid coordinates" });
    }
    setDraft((d) => [...d, [lat, lng]]);
    setManualPt({ lat: "", lng: "" });
  }

  function buildCoords(): number[][] | null {
    if (shape === "marker") return draft.length >= 1 ? [draft[0]] : null;
    if (shape === "circle") {
      // Prefer an explicit radius (km) with a center point; else two clicks.
      const km = parseFloat(radiusKm);
      if (draft.length >= 1 && !Number.isNaN(km) && km > 0) {
        return [[draft[0][0], draft[0][1], Math.round(km * 1000)]];
      }
      if (draft.length < 2) return null;
      const radius = haversine(draft[0], draft[1]);
      return [[draft[0][0], draft[0][1], Math.round(radius)]];
    }
    if (shape === "rectangle") {
      if (draft.length < 2) return null;
      const lats = draft.map((p) => p[0]);
      const lngs = draft.map((p) => p[1]);
      return [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ];
    }
    if (shape === "line") return draft.length >= 2 ? draft : null;
    return draft.length >= 3 ? draft : null; // polygon
  }

  async function save() {
    if (!name.trim()) return push({ kind: "error", title: "Name the marking first" });
    const coordinates = buildCoords();
    if (!coordinates) return push({ kind: "error", title: "Not enough points", message: tool.hint });
    setSaving(true);
    const res = await fetch("/api/markings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, shapeType: shape, category, color: effectiveColor, notes, coordinates }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return push({ kind: "error", title: "Save failed", message: data.error });
    setMarkings((m) => [
      { id: data.marking.id, name: data.marking.name, shapeType: shape, category, color: effectiveColor, coordinates, createdById: currentUserId, createdByName: currentUserName },
      ...m,
    ]);
    setDraft([]);
    setName("");
    setNotes("");
    setRadiusKm("");
    setManualPt({ lat: "", lng: "" });
    push({ kind: "success", title: "Marking saved", message: data.marking.name });
    router.refresh();
  }

  async function remove(m: Marking) {
    if (!confirm(`Delete marking "${m.name}"?`)) return;
    const res = await fetch(`/api/markings/${m.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return push({ kind: "error", title: "Delete failed", message: data.error });
    setMarkings((prev) => prev.filter((x) => x.id !== m.id));
    push({ kind: "success", title: "Marking deleted" });
  }

  const canDelete = (m: OwnedMarking) =>
    isAdmin || (canManage && m.createdById === currentUserId);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="relative h-[520px] overflow-hidden rounded-lg border border-white/8">
          <MarkingMap
            markings={markings}
            draft={draft}
            draftShape={shape}
            draftColor={effectiveColor}
            onAddPoint={addPoint}
            interactive={canManage}
            layer={layer}
            focused={focused}
          />
          <LayerSwitcher layer={layer} onChange={setLayer} className="absolute right-3 top-3 z-[500]" />
        </div>
        {canManage && (
          <p className="mt-2 text-xs text-slate-500">
            Tool: <span className="text-slate-300">{tool.label}</span> — {tool.hint} ({draft.length} placed)
          </p>
        )}
      </div>

      <div className="space-y-4">
        {canManage && (
          <div className="panel p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <PencilRuler className="h-3.5 w-3.5" /> Draw Marking
            </h3>

            {/* Shape tools */}
            <div className="grid grid-cols-5 gap-1.5">
              {SHAPE_TOOLS.map((t) => (
                <button
                  key={t.key}
                  title={t.label}
                  onClick={() => {
                    setShape(t.key);
                    setDraft([]);
                  }}
                  className={`flex flex-col items-center gap-1 rounded-lg border py-2 text-[0.55rem] uppercase tracking-wide transition-colors ${
                    shape === t.key
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                      : "border-white/10 text-slate-400 hover:bg-white/5"
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-3 space-y-3">
              <Field label="Category">
                <Select value={category} onChange={(e) => setCategory(e.target.value as MarkingCategory)}>
                  {MARKING_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{MARKING_CATEGORY_META[c].label}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Restricted Sector 7" />
              </Field>

              {showColorPicker && (
                <Field label={shape === "marker" ? "Marker Colour" : "Color"}>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {MARKER_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCustomColor(c)}
                          title={c}
                          className={`h-6 w-6 rounded-full border-2 transition ${
                            customColor.toLowerCase() === c.toLowerCase() ? "border-white" : "border-white/20"
                          }`}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="h-8 w-12 cursor-pointer rounded border border-white/10 bg-transparent"
                      />
                      <span className="font-mono text-xs text-slate-400">{customColor}</span>
                    </div>
                  </div>
                </Field>
              )}

              {/* Manual coordinate entry (alternative to clicking the map) */}
              <div className="rounded-lg border border-white/8 bg-navy-950/40 p-2.5">
                <p className="mb-1.5 text-[0.62rem] font-semibold uppercase tracking-wider text-slate-500">
                  {shape === "circle" ? "Circle center by coordinates" : "Add point by coordinates"}
                </p>
                <div className="flex items-end gap-2">
                  <label className="flex-1">
                    <span className="mb-1 block text-[0.6rem] uppercase tracking-wider text-slate-500">Lat</span>
                    <input value={manualPt.lat} onChange={(e) => setManualPt((m) => ({ ...m, lat: e.target.value }))} placeholder="28.61"
                      className="h-8 w-full rounded-md border border-white/10 bg-navy-950/60 px-2 text-xs text-slate-100 focus:border-emerald-500/40 focus:outline-none" />
                  </label>
                  <label className="flex-1">
                    <span className="mb-1 block text-[0.6rem] uppercase tracking-wider text-slate-500">Lng</span>
                    <input value={manualPt.lng} onChange={(e) => setManualPt((m) => ({ ...m, lng: e.target.value }))} placeholder="77.20"
                      className="h-8 w-full rounded-md border border-white/10 bg-navy-950/60 px-2 text-xs text-slate-100 focus:border-emerald-500/40 focus:outline-none" />
                  </label>
                  <Button type="button" variant="secondary" size="sm" onClick={addManualPoint}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {shape === "circle" && (
                  <label className="mt-2 block">
                    <span className="mb-1 block text-[0.6rem] uppercase tracking-wider text-slate-500">Radius (km) — optional</span>
                    <input value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} placeholder="e.g. 20"
                      className="h-8 w-full rounded-md border border-white/10 bg-navy-950/60 px-2 text-xs text-slate-100 focus:border-emerald-500/40 focus:outline-none" />
                    <span className="mt-1 block text-[0.6rem] text-slate-500">Set center (click/enter) + radius, or click center then edge.</span>
                  </label>
                )}

                {/* Placed coordinates */}
                {draft.length > 0 && (
                  <div className="mt-2 border-t border-white/8 pt-2">
                    <p className="mb-1 text-[0.6rem] font-semibold uppercase tracking-wider text-slate-500">
                      {shape === "circle" ? "Center / edge" : "Placed points"} ({draft.length})
                    </p>
                    <div className="max-h-24 space-y-1 overflow-y-auto">
                      {draft.map((p, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[0.66rem] text-slate-300">
                            {i + 1}. {p[0].toFixed(4)}, {p[1].toFixed(4)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDraft((d) => d.filter((_, idx) => idx !== i))}
                            className="text-slate-500 hover:text-red-300"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Field label="Notes">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Restriction details…" />
              </Field>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDraft((d) => d.slice(0, -1))} disabled={!draft.length} className="flex-1 justify-center">
                  <Undo2 className="h-3.5 w-3.5" /> Undo
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDraft([])} disabled={!draft.length} className="flex-1 justify-center">
                  Clear
                </Button>
              </div>
              <Button onClick={save} loading={saving} className="w-full justify-center">
                <Save className="h-4 w-4" /> Save Marking
              </Button>
            </div>
          </div>
        )}

        <div className="panel p-4">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-300">
            Markings ({markings.length})
          </h3>
          {markings.length > 0 && (
            <p className="mb-3 text-[0.62rem] text-slate-500">Click a marking to locate it on the map</p>
          )}
          <div className="space-y-2">
            {markings.map((m) => {
              const meta = MARKING_CATEGORY_META[m.category as MarkingCategory];
              const active = focusId === m.id;
              return (
                <div
                  key={m.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                    active ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/8 bg-navy-950/40"
                  }`}
                >
                  <button
                    onClick={() => setFocusId(m.id)}
                    title="Locate on map"
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-100">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: markingColor(m) }} />
                      <span className="truncate">{m.name}</span>
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge tone={meta?.tone}>{meta?.label ?? m.category}</Badge>
                      <span className="text-[0.66rem] uppercase tracking-wider text-slate-500">{m.shapeType}</span>
                    </div>
                  </button>
                  {canDelete(m) && (
                    <button onClick={() => remove(m)} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-red-500/10 hover:text-red-300">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
            {markings.length === 0 && <p className="py-4 text-center text-xs text-slate-500">No markings yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
