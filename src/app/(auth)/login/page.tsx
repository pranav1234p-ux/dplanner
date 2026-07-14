"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Radar, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { push } = useToast();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      push({ kind: "success", title: "Access granted", message: `Welcome, ${data.user.fullName}` });
      router.replace(params.get("from") || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
          <Radar className="h-5 w-5" />
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.2em]">Drone Command Center</p>
      </div>

      <h2 className="text-2xl font-bold text-slate-50">Secure Sign-In</h2>
      <p className="mt-1 text-sm text-slate-500">
        Authorized personnel only. All activity is logged.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label="Username">
          <Input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. admin"
            autoComplete="username"
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </Field>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} size="lg" className="w-full justify-center">
          <LogIn className="h-4 w-4" /> Authenticate
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Need an operator account?{" "}
        <Link href="/register" className="font-semibold text-emerald-400 hover:text-emerald-300">
          Request access
        </Link>
      </p>
    </motion.div>
  );
}

// useSearchParams() must be inside a Suspense boundary for the static build.
export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}
