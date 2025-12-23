// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

/**
 * Force local/binary Prisma Client (no Data Proxy / Accelerate), as you intended.
 * Keep this if you're connecting directly to your Postgres via DATABASE_URL.
 */
delete (process.env as any).PRISMA_ACCELERATE_URL;
if (process.env.PRISMA_CLIENT_ENGINE_TYPE === "dataproxy") {
  process.env.PRISMA_CLIENT_ENGINE_TYPE = "binary";
}
// Be explicit (harmless if already binary):
process.env.PRISMA_CLIENT_ENGINE_TYPE = "binary";

// Type-safe global cache to avoid re-instantiation during HMR in dev
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
    // If you ever need to override the URL at runtime:
    // datasources: { db: { url: process.env.DATABASE_URL } },
  });
}

// Reuse in dev, single instance in prod
export const prisma = global.__prisma__ ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") global.__prisma__ = prisma;

// Optional helper (nice for future custom extensions)
// export function getPrisma() { return prisma; }
