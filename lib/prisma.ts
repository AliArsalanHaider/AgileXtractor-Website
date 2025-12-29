// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

/**
 * Force local/binary Prisma Client (no Data Proxy / Accelerate),
 * keep direct Postgres DATABASE_URL behavior.
 */

// Remove Accelerate URL if present (safe no-op if missing)
if ("PRISMA_ACCELERATE_URL" in process.env) {
  delete process.env.PRISMA_ACCELERATE_URL;
}

// If explicitly set to dataproxy, force binary instead
if (process.env.PRISMA_CLIENT_ENGINE_TYPE === "dataproxy") {
  process.env.PRISMA_CLIENT_ENGINE_TYPE = "binary";
}
// Be explicit (harmless if already binary)
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
export const prisma = globalThis.__prisma__ ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.__prisma__ = prisma;

// Optional helper (nice for future custom extensions)
// export function getPrisma() { return prisma; }
