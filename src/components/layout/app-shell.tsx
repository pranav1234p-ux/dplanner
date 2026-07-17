"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Map as MapIcon,
  ListChecks,
  Plane,
  PencilRuler,
  MessageSquare,
  Users,
  Bell,
  UserCircle,
  Info,
  Radar,
  LogOut,
  Menu,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleBadge } from "@/components/ui/badge";
import { FloatingRefresh } from "./floating-refresh";
import { NotificationPopup } from "@/components/notifications/notification-popup";
import type { Role } from "@/lib/constants";

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  unit?: string | null;
};

type NavItem = { href: string; label: string; icon: React.ElementType; adminOnly?: boolean };

// Order: Dashboard, then Drone Directory (#2), then the rest. Notifications live
// in a floating popup (bell), not the nav.
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/drones", label: "Drone Directory", icon: Plane },
  { href: "/planner", label: "Mission Planner", icon: MapIcon },
  { href: "/missions", label: "Missions", icon: ListChecks },
  { href: "/map-marking", label: "Map Marking", icon: PencilRuler },
  { href: "/drone-detection", label: "Drone Detection", icon: Radar },
  { href: "/messages", label: "Free Text Message", icon: MessageSquare },
  { href: "/users", label: "User Management", icon: Users, adminOnly: true },
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/about", label: "About", icon: Info },
];

export function AppShell({
  user,
  unreadCount,
  unreadMessages = 0,
  children,
}: {
  user: SessionUser;
  unreadCount: number;
  unreadMessages?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);

  const items = NAV.filter((n) => !n.adminOnly || user.role === "ADMIN");
  const initials = user.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("");

  React.useEffect(() => {
    setMobileOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  // Full labelled sidebar (used in the mobile drawer).
  const FullSidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500/10 text-sky-400 glow-accent">
          <Radar className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-[0.8rem] font-bold uppercase tracking-[0.15em] text-slate-100">Command</p>
          <p className="text-[0.62rem] uppercase tracking-[0.25em] text-sky-400/80">Center</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-sky-500/10 text-sky-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/messages" && unreadMessages > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-sky-500 px-1 text-[0.62rem] font-bold text-navy-950">
                  {unreadMessages}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/8 p-3">
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-300 hover:bg-red-500/15"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <FloatingRefresh />

      {/* Desktop icon rail — compact so the content/maps get more room */}
      <aside className="hidden w-16 shrink-0 flex-col border-r border-white/8 bg-navy-900/60 lg:flex">
        <Link href="/dashboard" className="grid h-14 place-items-center border-b border-white/8" title="Command Center">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500/10 text-sky-400 glow-accent">
            <Radar className="h-5 w-5" />
          </span>
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "group relative flex items-center justify-center rounded-lg py-2.5 transition-colors",
                  active ? "bg-sky-500/10 text-sky-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-sky-400"
                  />
                )}
                <item.icon className="h-5 w-5" />
                {item.href === "/messages" && unreadMessages > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-sky-400 ring-2 ring-navy-900" />
                )}
                {/* hover flyout label */}
                <span className="pointer-events-none absolute left-full top-1/2 z-[60] ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-navy-800 px-2 py-1 text-xs text-slate-100 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col items-center gap-2 border-t border-white/8 p-2">
          <div title={user.fullName} className="grid h-9 w-9 place-items-center rounded-full bg-navy-700 text-xs font-bold text-sky-300">
            {initials}
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="grid h-9 w-9 place-items-center rounded-lg text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-64 border-r border-white/8 bg-navy-900 lg:hidden"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              {FullSidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/8 bg-navy-900/60 px-4 backdrop-blur">
          <button
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-white/5 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative hidden max-w-sm flex-1 items-center sm:flex">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-500" />
            <input
              id="global-search"
              placeholder="Search missions, drones, units…  ( / )"
              className="h-9 w-full rounded-lg border border-white/10 bg-navy-950/60 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-sky-500/40 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const q = (e.target as HTMLInputElement).value.trim();
                  if (q) router.push(`/missions?q=${encodeURIComponent(q)}`);
                }
              }}
            />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              title="Notifications"
              className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-100"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-sky-400 ring-2 ring-navy-900" />
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-white/5"
              >
                <div className="grid h-8 w-8 place-items-center rounded-full bg-navy-700 text-xs font-bold text-sky-300">
                  {initials}
                </div>
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      className="panel absolute right-0 z-20 mt-2 w-56 p-1.5"
                    >
                      <div className="px-3 py-2">
                        <p className="text-sm font-semibold text-slate-100">{user.fullName}</p>
                        <div className="mt-1.5">
                          <RoleBadge role={user.role} />
                        </div>
                      </div>
                      <div className="my-1 h-px bg-white/8" />
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
                        onClick={() => setMenuOpen(false)}
                      >
                        <UserCircle className="h-4 w-4" /> Profile
                      </Link>
                      <button
                        onClick={logout}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Floating notification popup */}
      <AnimatePresence>
        {notifOpen && (
          <>
            <div className="fixed inset-0 z-[9400]" onClick={() => setNotifOpen(false)} />
            <NotificationPopup onClose={() => setNotifOpen(false)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
