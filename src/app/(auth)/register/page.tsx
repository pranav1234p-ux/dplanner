"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { UserPlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

const FIELDS = [
  { name: "fullName", label: "Full Name", type: "text", placeholder: "Maj. R. Verma" },
  { name: "armyNumber", label: "Army Number", type: "text", placeholder: "IC-20544" },
  { name: "rank", label: "Rank", type: "text", placeholder: "Major" },
  { name: "unit", label: "Unit", type: "text", placeholder: "5 Aviation Squadron" },
  { name: "email", label: "Email", type: "email", placeholder: "name@dronecommand.mil" },
  { name: "username", label: "Username", type: "text", placeholder: "operator2" },
  { name: "password", label: "Password", type: "password", placeholder: "min. 6 characters" },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  function set(name: string, value: string) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      setDone(true);
      push({ kind: "success", title: "Request submitted", message: "Awaiting administrator approval" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sky-500/10 text-sky-400 glow-accent">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-slate-50">Request Submitted</h2>
        <p className="mt-2 text-sm text-slate-400">
          Your account is <span className="font-semibold text-amber-300">Pending Approval</span>. An
          administrator must approve it before you can sign in.
        </p>
        <Button className="mt-8 w-full justify-center" size="lg" onClick={() => router.push("/login")}>
          Return to Sign-In
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-bold text-slate-50">Request Operator Access</h2>
      <p className="mt-1 text-sm text-slate-500">
        New accounts require administrator approval before activation.
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.name} className={f.name === "email" ? "sm:col-span-2" : ""}>
            <Field label={f.label}>
              <Input
                type={f.type}
                required
                value={form[f.name] ?? ""}
                onChange={(e) => set(f.name, e.target.value)}
                placeholder={f.placeholder}
              />
            </Field>
          </div>
        ))}

        {error && (
          <div className="sm:col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="sm:col-span-2">
          <Button type="submit" loading={loading} size="lg" className="w-full justify-center">
            <UserPlus className="h-4 w-4" /> Submit Registration
          </Button>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-sky-400 hover:text-sky-300">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
