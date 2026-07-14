"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "dcc_refresh_pos";
const AUTO_MS = 30000;

/** A draggable, always-on floating control that refreshes server data on click
 *  and auto-refreshes every 30 seconds. Position persists in localStorage. */
export function FloatingRefresh() {
  const router = useRouter();
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);
  const [spinning, setSpinning] = React.useState(false);
  const drag = React.useRef({ active: false, moved: false, offX: 0, offY: 0, sx: 0, sy: 0 });

  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPos(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const refresh = React.useCallback(() => {
    setSpinning(true);
    router.refresh();
    window.setTimeout(() => setSpinning(false), 900);
  }, [router]);

  // Auto-refresh every 30 seconds.
  React.useEffect(() => {
    const t = window.setInterval(refresh, AUTO_MS);
    return () => window.clearInterval(t);
  }, [refresh]);

  function onPointerDown(e: React.PointerEvent) {
    const rect = e.currentTarget.getBoundingClientRect();
    drag.current = {
      active: true,
      moved: false,
      offX: e.clientX - rect.left,
      offY: e.clientY - rect.top,
      sx: e.clientX,
      sy: e.clientY,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.active) return;
    if (Math.hypot(e.clientX - drag.current.sx, e.clientY - drag.current.sy) > 4) drag.current.moved = true;
    const x = Math.max(8, Math.min(window.innerWidth - 60, e.clientX - drag.current.offX));
    const y = Math.max(8, Math.min(window.innerHeight - 40, e.clientY - drag.current.offY));
    setPos({ x, y });
  }

  function onPointerUp(e: React.PointerEvent) {
    if (drag.current.active) {
      if (!drag.current.moved) refresh();
      else if (pos) localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    }
    drag.current.active = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  const style: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y }
    : { left: "50%", top: 12, transform: "translateX(-50%)" };

  return (
    <div
      role="button"
      tabIndex={0}
      title="Refresh now — drag to move · auto-refreshes every 30s"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && refresh()}
      style={style}
      className={cn(
        "panel fixed z-[9000] flex cursor-move touch-none select-none items-center gap-1 rounded-full px-2 py-1.5",
        "glow-green text-emerald-200 shadow-lg",
      )}
    >
      {/* Back button — navigates to the previous tab (not part of drag/refresh) */}
      <button
        type="button"
        title="Back to previous tab"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          router.back();
        }}
        className="grid h-6 w-6 place-items-center rounded-full text-slate-300 hover:bg-white/10 hover:text-emerald-300"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <span className="h-4 w-px bg-white/15" />
      <RefreshCw className={cn("h-4 w-4", spinning && "animate-spin")} />
    </div>
  );
}
