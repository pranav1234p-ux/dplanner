"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "warning" | "info";
type Toast = { id: number; kind: ToastKind; title: string; message?: string };

type ToastCtx = { push: (t: Omit<Toast, "id">) => void };
const Ctx = React.createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};
const TONES = {
  success: "border-sky-500/40 text-sky-300",
  error: "border-red-500/40 text-red-300",
  warning: "border-amber-500/40 text-amber-300",
  info: "border-sky-500/40 text-sky-300",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((x) => x.id !== id));

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[9999] flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.kind];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={cn(
                  "panel pointer-events-auto flex items-start gap-3 border-l-2 px-4 py-3",
                  TONES[t.kind],
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-100">{t.title}</p>
                  {t.message && <p className="mt-0.5 text-xs text-slate-400">{t.message}</p>}
                </div>
                <button onClick={() => dismiss(t.id)} className="text-slate-500 hover:text-slate-200">
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
