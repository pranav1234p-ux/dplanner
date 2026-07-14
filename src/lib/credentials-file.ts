import "server-only";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "./prisma";

// SECURITY NOTE: This intentionally records PLAINTEXT passwords to disk so that an
// administrator has a recoverable credentials file for approved personnel. This is
// an explicit product requirement for this offline command-center demo; it is NOT a
// secure practice for a production/internet-facing deployment. Files are written to
// the project root and should be treated as sensitive (git-ignored).

const STORE_FILE = path.join(process.cwd(), "credentials-store.json");
const OUTPUT_FILE = path.join(process.cwd(), "APPROVED_CREDENTIALS.md");

// Known seed-account passwords (so the file is complete for the demo accounts).
const SEED_DEFAULTS: Record<string, string> = {
  admin: "Admin@123",
  operator1: "Operator@123",
  operator2: "Operator@123",
  viewer1: "Viewer@123",
};

type Store = Record<string, string>;

function readStore(): Store {
  try {
    return { ...SEED_DEFAULTS, ...JSON.parse(fs.readFileSync(STORE_FILE, "utf8")) };
  } catch {
    return { ...SEED_DEFAULTS };
  }
}

function writeStore(store: Store) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to write credentials store:", e);
  }
}

/** Record (or update) the plaintext password captured for a username. */
export function setPlainPassword(username: string, password: string) {
  const store = readStore();
  store[username] = password;
  writeStore(store);
}

/** Move a stored password to a new username (when a user renames themselves). */
export function renameStoredUser(oldUsername: string, newUsername: string, password?: string) {
  const store = readStore();
  const pw = password ?? store[oldUsername];
  if (pw) store[newUsername] = pw;
  if (oldUsername !== newUsername) delete store[oldUsername];
  writeStore(store);
}

/** Regenerate APPROVED_CREDENTIALS.md listing every admin-approved user. */
export async function regenerateApprovedCredentialsFile() {
  const store = readStore();
  const users = await prisma.user.findMany({
    where: { approvalStatus: "APPROVED" },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
  });

  const rows = users
    .map((u) => {
      const pw = store[u.username] ?? "(not captured — set on next password change)";
      return `| ${u.fullName} | ${u.role} | ${u.rank ?? "—"} | ${u.unit ?? "—"} | \`${u.username}\` | \`${pw}\` |`;
    })
    .join("\n");

  const md = `# Approved User Credentials

> **Auto-generated** — updated whenever an administrator approves a user or a user
> changes their credentials. Lists every admin-approved account.
>
> ⚠️ Contains plaintext passwords for operational recovery. Treat as sensitive.
> Last updated: ${new Date().toISOString()}

| Full Name | Role | Rank | Unit | Username | Password |
|-----------|------|------|------|----------|----------|
${rows}
`;

  try {
    fs.writeFileSync(OUTPUT_FILE, md, "utf8");
  } catch (e) {
    console.error("Failed to write approved credentials file:", e);
  }
}
