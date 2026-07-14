"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type AccountUser = {
  username: string;
  fullName: string;
  email: string;
  rank: string | null;
  unit: string | null;
  armyNumber: string | null;
};

export function CredentialsForm({ user }: { user: AccountUser }) {
  const router = useRouter();
  const { push } = useToast();

  const [fullName, setFullName] = React.useState(user.fullName);
  const [email, setEmail] = React.useState(user.email);
  const [rank, setRank] = React.useState(user.rank ?? "");
  const [unit, setUnit] = React.useState(user.unit ?? "");
  const [armyNumber, setArmyNumber] = React.useState(user.armyNumber ?? "");
  const [newUsername, setNewUsername] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword && newPassword !== confirm) {
      return push({ kind: "error", title: "Passwords do not match" });
    }
    setLoading(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        newUsername,
        newPassword,
        fullName,
        email,
        rank,
        unit,
        armyNumber,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return push({ kind: "error", title: "Update failed", message: data.error });
    push({ kind: "success", title: "Account updated", message: "Your details have been saved." });
    setNewPassword("");
    setConfirm("");
    setNewUsername("");
    setCurrentPassword("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Full Name">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Rank">
          <Input value={rank} onChange={(e) => setRank(e.target.value)} />
        </Field>
        <Field label="Army Unit">
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
        </Field>
        <Field label="Army Number">
          <Input value={armyNumber} onChange={(e) => setArmyNumber(e.target.value)} />
        </Field>
        <Field label="New Username" hint={`Current: ${user.username}`}>
          <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Leave blank to keep" autoComplete="username" />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="New Password">
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 chars — blank to keep" autoComplete="new-password" />
        </Field>
        <Field label="Confirm New Password">
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat new password" autoComplete="new-password" />
        </Field>
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
        <Field label="Current Password (required to save changes)">
          <Input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Confirm it's you"
            autoComplete="current-password"
          />
        </Field>
      </div>

      <Button type="submit" loading={loading} className="w-full justify-center">
        <KeyRound className="h-4 w-4" /> Save Account Changes
      </Button>
    </form>
  );
}
