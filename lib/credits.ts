// lib/credits.ts
import { prisma } from "./db";

export const TRIAL_CREDITS = 500;
export const COST_PER_DOC = 100;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toDTO(row: any) {
  return {
    accountId: row.accountId,
    email: row.email,
    totalCredits: row.totalCredits,
    consumedCredits: row.consumedCredits,
    remainingCredits: row.remainingCredits,
    active: row.active,
  };
}

export async function getStatus(email: string) {
  const row = await prisma.registration.findUnique({ where: { email } });
  return row ? toDTO(row) : null;
}

export async function register(email: string) {
  if (!EMAIL_RE.test(email)) {
    const e: any = new Error("invalid_email");
    e.code = "INVALID_EMAIL";
    throw e;
  }

  // Create once with 500 trial; if exists, return as-is (no re-topup)
  const row = await prisma.registration.upsert({
    where: { email },
    update: {}, // do not modify existing on re-register
    create: {
      email,
      totalCredits: TRIAL_CREDITS,
      consumedCredits: 0,
      remainingCredits: TRIAL_CREDITS,
      active: true,
    },
  });
  return toDTO(row);
}

/**
 * Consume accepts either a fixed 'amount' or a 'docs' count (each 100).
 * Throws:
 *  - NO_ACCOUNT      (404)
 *  - INACTIVE        (403)
 *  - INSUFFICIENT    (402)
 *  - INVALID_AMOUNT  (400)
 */
export async function consume(email: string, opts: { amount?: number; docs?: number }) {
  if (!email) {
    const e: any = new Error("email required");
    e.code = "BAD_REQUEST";
    throw e;
  }

  let toConsume = 0;
  if (typeof opts.amount === "number") toConsume = Math.max(0, Math.floor(opts.amount));
  else if (typeof opts.docs === "number") toConsume = Math.max(0, Math.floor(opts.docs) * COST_PER_DOC);

  if (!Number.isFinite(toConsume) || toConsume <= 0) {
    const e: any = new Error("invalid amount");
    e.code = "INVALID_AMOUNT";
    throw e;
  }

  return await prisma.$transaction(async (tx) => {
    const acc = await tx.registration.findUnique({ where: { email } });
    if (!acc) {
      const e: any = new Error("no account");
      e.code = "NO_ACCOUNT";
      throw e;
    }
    if (!acc.active) {
      const e: any = new Error("inactive");
      e.code = "INACTIVE";
      throw e;
    }
    if (acc.remainingCredits < toConsume) {
      const e: any = new Error("insufficient");
      e.code = "INSUFFICIENT";
      throw e;
    }

    const updated = await tx.registration.update({
      where: { email },
      data: {
        consumedCredits: { increment: toConsume },
        remainingCredits: { decrement: toConsume },
      },
    });
    return toDTO(updated);
  });
}

/** optional top-up for paid plans */
export async function addPaidCredits(email: string, add: number) {
  if (!email) {
    const e: any = new Error("email required");
    e.code = "BAD_REQUEST";
    throw e;
  }
  if (!Number.isFinite(add) || add <= 0) {
    const e: any = new Error("invalid amount");
    e.code = "INVALID_AMOUNT";
    throw e;
  }

  const row = await prisma.registration.upsert({
    where: { email },
    update: {
      totalCredits: { increment: add },
      remainingCredits: { increment: add },
      active: true,
    },
    create: {
      email,
      totalCredits: TRIAL_CREDITS + add,
      consumedCredits: 0,
      remainingCredits: TRIAL_CREDITS + add,
      active: true,
    },
  });
  return toDTO(row);
}
