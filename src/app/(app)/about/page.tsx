import { Radar, Tag, User, CalendarClock, ScrollText, Mail, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { APP_INFO } from "@/lib/constants";

const ITEMS = [
  { icon: Tag, label: "Version", value: APP_INFO.version },
  { icon: User, label: "Developer", value: APP_INFO.developer },
  { icon: CalendarClock, label: "Last Updated", value: APP_INFO.lastUpdated },
  { icon: ScrollText, label: "License", value: APP_INFO.license },
  { icon: Mail, label: "Contact", value: APP_INFO.contact },
];

const FEATURES = [
  "Role-based access control with strict permission enforcement",
  "Offline-capable tactical mission planning",
  "Audit logs for every significant action",
  "Mission export as GeoJSON and CSV, printable flight plans",
  "Encrypted credentials & database-backed JWT sessions",
  "Ready for live telemetry, weather, and GIS integration",
];

export default function AboutPage() {
  return (
    <div>
      <PageHeader title="About" subtitle="Application information" />
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-sky-500/10 text-sky-400 glow-accent">
              <Radar className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-50">{APP_INFO.name}</h2>
              <p className="text-sm text-slate-500">
                Secure military drone mission planning & command-and-control platform.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="divide-y divide-white/5 py-0">
            {ITEMS.map((it) => (
              <div key={it.label} className="flex items-center gap-3 py-3">
                <it.icon className="h-4 w-4 text-slate-500" />
                <span className="w-32 text-[0.7rem] uppercase tracking-wider text-slate-500">{it.label}</span>
                <span className="text-sm text-slate-200">{it.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle><ShieldCheck className="h-3.5 w-3.5" /> Capabilities</CardTitle></CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
