// lib/credits.ts
import { PrismaClient, Prisma } from "@prisma/client";

// Reuse Prisma client in dev to avoid connection storms with HMR
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") global.__prisma__ = prisma;

const STARTING_CREDITS = 500;
const COST_PER_DOC = 100;

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Compute remaining from totals (clamped to 0)
function computeRemaining(total: number, consumed: number) {
  const r = (total ?? 0) - (consumed ?? 0);
  return r > 0 ? r : 0;
}

// Keep UI compatibility (camelCase + legacy keys), and always expose computed remaining
function expose(row: any) {
  const remaining = computeRemaining(row.totalCredits, row.consumedCredits);
  return {
    accountId: row.accountId,
    email: row.email,
    totalCredits: row.totalCredits,
    consumedCredits: row.consumedCredits,
    remainingCredits: remaining,
    active: row.active,

    // legacy / sheet-like keys expected by existing UI
    Account_ID: row.accountId,
    Email_ID: row.email,
    Total_Credits: row.totalCredits,
    Consumed_Credits: row.consumedCredits,
    Remaining_Credits: remaining,
    Active: row.active,
  };
}

export async function getStatus(email: string) {
  if (!isValidEmail(email)) return null;
  const row = await prisma.registration.findUnique({ where: { email } });
  return row ? expose(row) : null;
}

export async function register(email: string) {
  if (!isValidEmail(email)) {
    const err = new Error("invalid email");
    (err as any).code = "INVALID_EMAIL";
    throw err;
  }

  // Do NOT reset credits if user exists already
  const row = await prisma.registration.upsert({
    where: { email },
    update: {},
    create: {
      email,
      totalCredits: STARTING_CREDITS,
      consumedCredits: 0,
      // keep stored remaining in sync on create
      remainingCredits: STARTING_CREDITS,
      active: true,
    },
  });

  // Expose computed remaining so manual totalCredits edits reflect immediately
  return expose(row);
}

export async function addPaidCredits(email: string, add: number) {
  if (!isValidEmail(email)) {
    const err = new Error("invalid email");
    (err as any).code = "INVALID_EMAIL";
    throw err;
  }
  if (!Number.isFinite(add) || add <= 0) {
    const err = new Error("add must be > 0");
    (err as any).code = "BAD_ADD";
    throw err;
  }

  // Update total, and recompute remaining from (newTotal - consumed)
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const found = await tx.registration.findUnique({ where: { email } });
    if (!found) {
      const err = new Error("account not found");
      (err as any).code = "NO_ACCOUNT";
      throw err;
    }
    const newTotal = (found.totalCredits ?? 0) + add;
    const newRemaining = computeRemaining(newTotal, found.consumedCredits ?? 0);

    const updated = await tx.registration.update({
      where: { email },
      data: {
        totalCredits: { increment: add },
        remainingCredits: newRemaining, // keep the stored column consistent
      },
    });

    return expose(updated);
  });
}

type ConsumeArg =
  | number
  | {
      docs?: number;   // charges docs * 100 if amount not provided
      amount?: number; // explicit amount to charge
      ok?: boolean;    // if false => no charge (e.g., error path)
    };

export async function consume(email: string, arg: ConsumeArg) {
  if (!isValidEmail(email)) {
    const err = new Error("invalid email");
    (err as any).code = "INVALID_EMAIL";
    throw err;
  }

  // Normalize args
  let ok = true;
  let amount = 0;

  if (typeof arg === "number") {
    amount = Math.max(0, Math.floor(arg));
  } else {
    ok = arg.ok !== false;
    const docs = Math.max(0, Math.floor(arg.docs ?? 0));
    const direct = Math.max(0, Math.floor(arg.amount ?? 0));
    amount = direct > 0 ? direct : docs * COST_PER_DOC;
  }

  // No-op charge (e.g., client reported an error or zero docs)
  if (!ok || amount <= 0) {
    const row = await prisma.registration.findUnique({ where: { email } });
    if (!row) {
      const err = new Error("account not found");
      (err as any).code = "NO_ACCOUNT";
      throw err;
    }
    return expose(row);
  }

  // Atomic charge with available computed from (total - consumed),
  // so manual increases to totalCredits are honored immediately.
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const found = await tx.registration.findUnique({ where: { email } });
    if (!found) {
      const err = new Error("account not found");
      (err as any).code = "NO_ACCOUNT";
      throw err;
    }
    if (!found.active) {
      const err = new Error("account inactive");
      (err as any).code = "INACTIVE";
      throw err;
    }

    const available = computeRemaining(found.totalCredits ?? 0, found.consumedCredits ?? 0);
    if (available < amount) {
      const err = new Error("insufficient credits");
      (err as any).code = "INSUFFICIENT";
      throw err;
    }

    const newConsumed = (found.consumedCredits ?? 0) + amount;
    const newRemaining = computeRemaining(found.totalCredits ?? 0, newConsumed);

    const updated = await tx.registration.update({
      where: { email },
      data: {
        consumedCredits: { increment: amount },
        remainingCredits: newRemaining, // keep stored remaining in sync
      },
    });

    return expose(updated);
  });
}
