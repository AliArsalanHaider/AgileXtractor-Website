// lib/credits.ts
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// --- Config (read from env, with safe fallbacks) ---
const STARTING_CREDITS = Number(
  process.env.CREDITS_TRIAL ?? process.env.CREDITS_MONTHLY_FREE ?? 0
);
const COST_PER_DOC = Number(process.env.CREDITS_COST_PER_DOC ?? 100);

// Basic email sanity
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Compute remaining from totals (clamped to 0)
function computeRemaining(total: number, consumed: number) {
  const r = (total ?? 0) - (consumed ?? 0);
  return r > 0 ? r : 0;
}

type RegistrationRow = {
  accountId: number;
  email: string;
  totalCredits: number | null;
  consumedCredits: number | null;
  remainingCredits: number | null;
  active: boolean;
};

// Keep UI compatibility (camelCase + legacy keys), and always expose computed remaining
function expose(row: RegistrationRow) {
  const remaining = computeRemaining(row.totalCredits ?? 0, row.consumedCredits ?? 0);
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

type CodedError = Error & { code?: string };
function setCode(err: Error, code: string) {
  (err as CodedError).code = code;
}

// ---- Public API ----

export async function getStatus(email: string) {
  if (!isValidEmail(email)) return null;
  const row = await prisma.registration.findUnique({ where: { email } });
  return row ? expose(row as unknown as RegistrationRow) : null;
}

export async function register(email: string) {
  if (!isValidEmail(email)) {
    const err = new Error("invalid email");
    setCode(err, "INVALID_EMAIL");
    throw err;
  }

  // Do NOT reset credits if user exists already
  const row = await prisma.registration.upsert({
    where: { email },
    update: {}, // keep existing totals intact
    create: {
      email,
      totalCredits: STARTING_CREDITS,
      consumedCredits: 0,
      remainingCredits: STARTING_CREDITS, // keep stored remaining in sync on create
      active: true,
    },
  });

  return expose(row as unknown as RegistrationRow);
}

export async function addPaidCredits(email: string, add: number) {
  if (!isValidEmail(email)) {
    const err = new Error("invalid email");
    setCode(err, "INVALID_EMAIL");
    throw err;
  }
  if (!Number.isFinite(add) || add <= 0) {
    const err = new Error("add must be > 0");
    setCode(err, "BAD_ADD");
    throw err;
  }

  // Update total, and recompute remaining from (newTotal - consumed)
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const found = await tx.registration.findUnique({ where: { email } });
    if (!found) {
      const err = new Error("account not found");
      setCode(err, "NO_ACCOUNT");
      throw err;
    }

    const f = found as unknown as RegistrationRow;
    const newTotal = (f.totalCredits ?? 0) + add;
    const newRemaining = computeRemaining(newTotal, f.consumedCredits ?? 0);

    const updated = await tx.registration.update({
      where: { email },
      data: {
        totalCredits: { increment: add },
        remainingCredits: newRemaining,
      },
    });

    return expose(updated as unknown as RegistrationRow);
  });
}

type ConsumeArg =
  | number
  | {
      docs?: number;
      amount?: number;
      ok?: boolean;
    };

export async function consume(email: string, arg: ConsumeArg) {
  if (!isValidEmail(email)) {
    const err = new Error("invalid email");
    setCode(err, "INVALID_EMAIL");
    throw err;
  }

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

  if (!ok || amount <= 0) {
    const row = await prisma.registration.findUnique({ where: { email } });
    if (!row) {
      const err = new Error("account not found");
      setCode(err, "NO_ACCOUNT");
      throw err;
    }
    return expose(row as unknown as RegistrationRow);
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const found = await tx.registration.findUnique({ where: { email } });
    if (!found) {
      const err = new Error("account not found");
      setCode(err, "NO_ACCOUNT");
      throw err;
    }

    const f = found as unknown as RegistrationRow;

    if (!f.active) {
      const err = new Error("account inactive");
      setCode(err, "INACTIVE");
      throw err;
    }

    const available = computeRemaining(f.totalCredits ?? 0, f.consumedCredits ?? 0);
    if (available < amount) {
      const err = new Error("insufficient credits");
      setCode(err, "INSUFFICIENT");
      throw err;
    }

    const updated = await tx.registration.update({
      where: { email },
      data: {
        consumedCredits: { increment: amount },
        remainingCredits: computeRemaining(
          f.totalCredits ?? 0,
          (f.consumedCredits ?? 0) + amount
        ),
      },
    });

    return expose(updated as unknown as RegistrationRow);
  });
}
