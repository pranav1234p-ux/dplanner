"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, RefreshCw, Trash2, Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { DroneStatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { DRONE_STATUSES } from "@/lib/constants";

export type Drone = {
  id: string;
  droneId: string;
  name: string;
  type: string;
  frequency: string;
  unit: string;
  latitude: number;
  longitude: number;
  status: string;
  createdById?: string | null;
};

type Perms = {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canDeleteOwn: boolean;
  canStatus: boolean;
};

const EMPTY: Omit<Drone, "id"> = {
  droneId: "",
  name: "",
  type: "",
  frequency: "",
  unit: "",
  latitude: 0,
  longitude: 0,
  status: "STANDBY",
};

export function DroneDirectory({
  initial,
  perms,
  currentUserId,
}: {
  initial: Drone[];
  perms: Perms;
  currentUserId: string;
}) {
  const { push } = useToast();
  const canDeleteDrone = (d: Drone) =>
    perms.canDelete || (perms.canDeleteOwn && d.createdById === currentUserId);
  const [drones, setDrones] = React.useState<Drone[]>(initial);
  const [q, setQ] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [type, setType] = React.useState("");

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Drone | null>(null);
  const [statusFor, setStatusFor] = React.useState<Drone | null>(null);

  const units = React.useMemo(() => [...new Set(drones.map((d) => d.unit))].sort(), [drones]);
  const types = React.useMemo(() => [...new Set(drones.map((d) => d.type))].sort(), [drones]);

  const filtered = drones.filter((d) => {
    const hay = `${d.name} ${d.droneId} ${d.unit} ${d.type}`.toLowerCase();
    return (
      hay.includes(q.toLowerCase()) &&
      (!unit || d.unit === unit) &&
      (!status || d.status === status) &&
      (!type || d.type === type)
    );
  });

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(d: Drone) {
    setEditing(d);
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            className="pl-9"
            placeholder="Search by name, ID, unit, or type…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 lg:w-[420px]">
          <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="">All Units</option>
            {units.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {DRONE_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All Types</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
        {perms.canCreate && (
          <Button onClick={openAdd} className="shrink-0">
            <Plus className="h-4 w-4" /> Add Drone
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-white/8 text-left text-[0.68rem] uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-semibold">Drone ID</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Frequency</th>
              <th className="px-4 py-3 font-semibold">Unit</th>
              <th className="px-4 py-3 font-semibold">Base Coords</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              {(perms.canEdit || perms.canStatus || perms.canDelete || perms.canDeleteOwn) && (
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <motion.tr
                key={d.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3 font-mono text-emerald-300">{d.droneId}</td>
                <td className="px-4 py-3 font-medium text-slate-100">{d.name}</td>
                <td className="px-4 py-3 text-slate-300">{d.type}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{d.frequency}</td>
                <td className="px-4 py-3 text-slate-300">{d.unit}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 font-mono text-xs text-slate-400">
                    <MapPin className="h-3 w-3 text-slate-600" />
                    {d.latitude.toFixed(3)}, {d.longitude.toFixed(3)}
                  </span>
                </td>
                <td className="px-4 py-3"><DroneStatusBadge status={d.status} /></td>
                {(perms.canEdit || perms.canStatus || perms.canDelete || perms.canDeleteOwn) && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {perms.canStatus && (
                        <button
                          title="Change status"
                          onClick={() => setStatusFor(d)}
                          className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-white/5 hover:text-emerald-300"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {perms.canEdit && (
                        <button
                          title="Edit"
                          onClick={() => openEdit(d)}
                          className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-white/5 hover:text-sky-300"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDeleteDrone(d) && (
                        <button
                          title="Delete"
                          onClick={() => handleDelete(d)}
                          className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </motion.tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                  No drones match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Showing {filtered.length} of {drones.length} drones
      </p>

      {formOpen && (
        <DroneFormModal
          drone={editing}
          onClose={() => setFormOpen(false)}
          onSaved={(saved, isNew) => {
            setDrones((prev) => (isNew ? [...prev, saved] : prev.map((x) => (x.id === saved.id ? saved : x))));
            setFormOpen(false);
          }}
        />
      )}

      {statusFor && (
        <StatusModal
          drone={statusFor}
          onClose={() => setStatusFor(null)}
          onSaved={(saved) => {
            setDrones((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
            setStatusFor(null);
          }}
        />
      )}
    </div>
  );

  async function handleDelete(d: Drone) {
    if (!confirm(`Remove ${d.name} (${d.droneId}) from the fleet?`)) return;
    const res = await fetch(`/api/drones/${d.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return push({ kind: "error", title: "Delete failed", message: data.error });
    setDrones((prev) => prev.filter((x) => x.id !== d.id));
    push({ kind: "success", title: "Drone removed", message: `${d.name} deleted.` });
  }
}

function DroneFormModal({
  drone,
  onClose,
  onSaved,
}: {
  drone: Drone | null;
  onClose: () => void;
  onSaved: (d: Drone, isNew: boolean) => void;
}) {
  const { push } = useToast();
  const [form, setForm] = React.useState(drone ?? { ...EMPTY });
  const [loading, setLoading] = React.useState(false);
  const isNew = !drone;

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const url = isNew ? "/api/drones" : `/api/drones/${drone!.id}`;
    const method = isNew ? "POST" : "PATCH";
    const payload = isNew
      ? form
      : { name: form.name, type: form.type, frequency: form.frequency, unit: form.unit, latitude: form.latitude, longitude: form.longitude };
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return push({ kind: "error", title: "Save failed", message: data.error });
    push({ kind: "success", title: isNew ? "Drone added" : "Drone updated", message: data.drone.name });
    onSaved(data.drone, isNew);
  }

  return (
    <Modal open onClose={onClose} title={isNew ? "Add Drone" : `Edit ${drone!.name}`}>
      <form onSubmit={submit} className="grid grid-cols-2 gap-4">
        <Field label="Drone ID">
          <Input value={form.droneId} disabled={!isNew} onChange={(e) => set("droneId", e.target.value)} placeholder="DRN-007" required />
        </Field>
        <Field label="Name">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Falcon-7" required />
        </Field>
        <Field label="Type">
          <Input value={form.type} onChange={(e) => set("type", e.target.value)} placeholder="Quadcopter" required />
        </Field>
        <Field label="Frequency">
          <Input value={form.frequency} onChange={(e) => set("frequency", e.target.value)} placeholder="2.4 GHz" required />
        </Field>
        <div className="col-span-2">
          <Field label="Army Unit">
            <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="5 Aviation Squadron" required />
          </Field>
        </div>
        <Field label="Base Latitude">
          <Input type="number" step="any" value={form.latitude} onChange={(e) => set("latitude", parseFloat(e.target.value))} required />
        </Field>
        <Field label="Base Longitude">
          <Input type="number" step="any" value={form.longitude} onChange={(e) => set("longitude", parseFloat(e.target.value))} required />
        </Field>
        {isNew && (
          <div className="col-span-2">
            <Field label="Initial Status">
              <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                {DRONE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
          </div>
        )}
        <div className="col-span-2 mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>{isNew ? "Add Drone" : "Save Changes"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function StatusModal({
  drone,
  onClose,
  onSaved,
}: {
  drone: Drone;
  onClose: () => void;
  onSaved: (d: Drone) => void;
}) {
  const { push } = useToast();
  const [status, setStatus] = React.useState(drone.status);
  const [loading, setLoading] = React.useState(false);

  async function submit() {
    setLoading(true);
    const res = await fetch(`/api/drones/${drone.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return push({ kind: "error", title: "Update failed", message: data.error });
    push({ kind: "success", title: "Status changed", message: `${drone.name} → ${status}` });
    onSaved(data.drone);
  }

  return (
    <Modal open onClose={onClose} title={`Change Status — ${drone.name}`} className="max-w-sm">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-2">
          {DRONE_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
                status === s ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/10 hover:bg-white/5"
              }`}
            >
              <DroneStatusBadge status={s} />
              {status === s && <span className="text-xs text-emerald-300">Selected</span>}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={loading}>Update Status</Button>
        </div>
      </div>
    </Modal>
  );
}
