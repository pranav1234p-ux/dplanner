import { Radar, ShieldCheck, Lock } from "lucide-react";
import { APP_INFO } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Branding / mission panel */}
      <div className="relative hidden overflow-hidden border-r border-white/10 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-500/20" />
          <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-500/20" />
          <div className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-500/20 animate-pulse-ring" />
        </div>
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400 glow-green">
            <Radar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-100">
              {APP_INFO.name}
            </p>
            <p className="text-[0.7rem] uppercase tracking-[0.3em] text-emerald-400/80">
              Command &amp; Control
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-bold leading-tight text-slate-50">
            Plan, approve, and command every sortie from one secure operations center.
          </h1>
          <ul className="mt-8 space-y-3 text-sm text-slate-400">
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Role-based access with strict
              permission enforcement
            </li>
            <li className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-emerald-400" /> Encrypted credentials &amp;
              database-backed sessions
            </li>
            <li className="flex items-center gap-3">
              <Radar className="h-4 w-4 text-emerald-400" /> Offline-capable tactical mission
              planning
            </li>
          </ul>
        </div>

        <p className="relative text-[0.7rem] uppercase tracking-widest text-slate-600">
          {APP_INFO.license} · v{APP_INFO.version}
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
