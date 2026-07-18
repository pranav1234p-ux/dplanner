import "server-only";
import bcrypt from "bcryptjs";

/**
 * Break-glass master administrator.
 *
 * Authenticates from environment variables only — never the repository or the
 * database — so it can sign in even when the (remote) database is unreachable.
 * It is DISABLED unless both MASTER_ADMIN_USERNAME and MASTER_ADMIN_PASSWORD_HASH
 * are set, so the public repo ships no default backdoor.
 *
 * Generate the hash without ever putting the plaintext in a file:
 *   node scripts/hash-master-password.mjs "YourChosenPassword"
 */

export const MASTER_ADMIN_SYNTHETIC_SUB = "master-admin";

export function masterAdminEnabled(): boolean {
  return Boolean(process.env.MASTER_ADMIN_USERNAME && process.env.MASTER_ADMIN_PASSWORD_HASH);
}

export function isMasterUsername(username: string): boolean {
  const configured = process.env.MASTER_ADMIN_USERNAME;
  return Boolean(configured) && username === configured;
}

export async function verifyMasterPassword(password: string): Promise<boolean> {
  const encoded = process.env.MASTER_ADMIN_PASSWORD_HASH;
  if (!encoded) return false;
  try {
    // Stored base64-encoded so the '$' in a bcrypt hash isn't mangled by the
    // dotenv loader's variable expansion. Decode back to the real hash first.
    const hash = Buffer.from(encoded, "base64").toString("utf8");
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export function masterFullName(): string {
  return process.env.MASTER_ADMIN_NAME || "Master Administrator";
}
