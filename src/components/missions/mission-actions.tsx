"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, FileDown, Printer, Map as MapIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { MISSION_STATUSES } from "@/lib/constants";

type WP = { sequence: number; latitude: number; longitude: number; altitude: number; speed: number; hoverTime: number };

export function MissionActions({
  missionId,
  missionCode,
  missionName,
  approvalStatus,
  missionStatus,
  waypoints,
  canApprove,
  canStatus,
  canDelete,
}: {
  missionId: string;
  missionCode: string;
  missionName: string;
  approvalStatus: string;
  missionStatus: string;
  waypoints: WP[];
  canApprove: boolean;
  canStatus: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function decide(decision: "APPROVE" | "REJECT") {
    setBusy(true);
    const res = await fetch(`/api/missions/${missionId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return push({ kind: "error", title: "Action failed", message: data.error });
    push({
      kind: decision === "APPROVE" ? "success" : "warning",
      title: decision === "APPROVE" ? "Mission approved" : "Mission rejected",
      message: data.mission.adcNumber ? `${data.mission.adcNumber} assigned` : undefined,
    });
    router.refresh();
  }

  async function changeStatus(status: string) {
    setBusy(true);
    const res = await fetch(`/api/missions/${missionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ missionStatus: status }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return push({ kind: "error", title: "Update failed", message: data.error });
    push({ kind: "success", title: "Status updated", message: `${missionCode} → ${status}` });
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete mission ${missionCode}? This cannot be undone.`)) return;
    const res = await fetch(`/api/missions/${missionId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return push({ kind: "error", title: "Delete failed", message: data.error });
    push({ kind: "success", title: "Mission deleted" });
    router.push("/missions");
  }

  function download(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    push({ kind: "info", title: "Export ready", message: filename });
  }

  function exportGeoJSON() {
    const geo = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: missionName, code: missionCode, kind: "flight-path" },
          geometry: {
            type: "LineString",
            coordinates: waypoints.map((w) => [w.longitude, w.latitude, w.altitude]),
          },
        },
        ...waypoints.map((w) => ({
          type: "Feature",
          properties: { sequence: w.sequence, altitude: w.altitude, speed: w.speed, hoverTime: w.hoverTime },
          geometry: { type: "Point", coordinates: [w.longitude, w.latitude] },
        })),
      ],
    };
    download(`${missionCode}.geojson`, JSON.stringify(geo, null, 2), "application/geo+json");
  }

  function exportCSV() {
    const header = "sequence,latitude,longitude,altitude_m,speed_ms,hover_s";
    const rows = waypoints.map((w) => `${w.sequence},${w.latitude},${w.longitude},${w.altitude},${w.speed},${w.hoverTime}`);
    download(`${missionCode}-waypoints.csv`, [header, ...rows].join("\n"), "text/csv");
  }

  return (
    <div className="space-y-4">
      {canApprove && approvalStatus === "PENDING" && (
        <div className="flex flex-col gap-2">
          <Button onClick={() => decide("APPROVE")} loading={busy} className="w-full justify-center">
            <CheckCircle2 className="h-4 w-4" /> Approve &amp; Generate ADC
          </Button>
          <Button onClick={() => decide("REJECT")} loading={busy} variant="danger" className="w-full justify-center">
            <XCircle className="h-4 w-4" /> Reject Flight Plan
          </Button>
        </div>
      )}

      {canStatus && (
        <div>
          <label className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">
            Change Mission Status
          </label>
          <Select value={missionStatus} onChange={(e) => changeStatus(e.target.value)} disabled={busy}>
            {MISSION_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        <Button variant="secondary" onClick={() => window.print()} className="justify-center">
          <Printer className="h-4 w-4" /> Print
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={exportGeoJSON} className="justify-center">
            <MapIcon className="h-4 w-4" /> GeoJSON
          </Button>
          <Button variant="outline" onClick={exportCSV} className="justify-center">
            <FileDown className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {canDelete && (
        <Button variant="ghost" onClick={remove} className="w-full justify-center text-red-300 hover:bg-red-500/10">
          <Trash2 className="h-4 w-4" /> Delete Mission
        </Button>
      )}
    </div>
  );
}
