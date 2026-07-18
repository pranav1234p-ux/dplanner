import { PrismaClient } from "@prisma/client";
import { PrismaClient as OfflinePrismaClient } from "@/generated/offline-client";

// With OFFLINE_MODE=1 the app talks to a local SQLite database (prisma/offline.db)
// instead of Supabase, so it runs with no network — e.g. a master-admin login in
// the field. The two generated clients share the same model API, so the rest of
// the app uses `prisma` unchanged; only the backing store differs.
const OFFLINE = process.env.OFFLINE_MODE === "1";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  if (OFFLINE) {
    return new OfflinePrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    }) as unknown as PrismaClient;
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
