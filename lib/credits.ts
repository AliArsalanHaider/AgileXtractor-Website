// lib/credits.ts
import { prisma } from "@/lib/prisma";

export type CreditsRow = {
  email: string;
  totalCredits: number;
  consumedCredits: number;
  remainingCredits: number;
  active: boolean;
};

const norm = (email: string) => email.trim().toLowerCase();

/** Create account if missing; leaves existing rows unchanged. */
export async function register(email: string, initialTotal = 0): Promise<CreditsRow> {
  const e = norm(email);
  const row = await prisma.registration.upsert({
    where: { email: e },
    update: {}, // do not modify on re-register
    create: {
      email: e,
      totalCredits: initialTotal,
      consumedCredits: 0,
      remainingCredits: initialTotal,
      active: true,
    },
    select: {
      email: true,
      totalCredits: true,
      consumedCredits: true,
      remainingCredits: true,
      active: true,
    },
  });
  return row;
}

/** Get current status; throws { code: 'NO_ACCOUNT' } if missing. */
export async function getStatus(email: string): Promise<CreditsRow> {
  const e = norm(email);
  const row = await prisma.registration.findUnique({
    where: { email: e },
    select: {
      email: true,
      totalCredits: true,
      consumedCredits: true,
      remainingCredits: true,
      active: true,
    },
  });
  if (!row) throw Object.assign(new Error("Account not found"), { code: "NO_ACCOUNT" });
  return row;
}

/** Add paid credits atomically; creates account if it doesn’t exist. */
export async function addPaidCredits(email: string, amount: number): Promise<CreditsRow> {
  const e = norm(email);
  const amt = Math.floor(Number(amount));
  if (!Number.isFinite(amt) || amt <= 0) throw new Error("Amount must be a positive integer");

  // Try to update an existing row atomically
  const res = await prisma.registration.updateMany({
    where: { email: e },
    data: {
      totalCredits: { increment: amt },
      remainingCredits: { increment: amt },
    },
  });

  if (res.count === 0) {
    // No row: create it with this balance
    return prisma.registration.create({
      data: {
        email: e,
        totalCredits: amt,
        consumedCredits: 0,
        remainingCredits: amt,
        active: true,
      },
      select: {
        email: true,
        totalCredits: true,
        consumedCredits: true,
        remainingCredits: true,
        active: true,
      },
    });
  }

  // Return the updated row
  return prisma.registration.findUniqueOrThrow({
    where: { email: e },
    select: {
      email: true,
      totalCredits: true,
      consumedCredits: true,
      remainingCredits: true,
      active: true,
    },
  });
}

/**
 * Consume credits atomically; throws:
 *  - { code: 'NO_ACCOUNT' } if account missing
 *  - { code: 'INSUFFICIENT' } if not enough credits
 */
export async function consume(email: string, amount: number): Promise<CreditsRow> {
  const e = norm(email);
  const amt = Math.floor(Number(amount));
  if (!Number.isFinite(amt) || amt <= 0) throw new Error("Amount must be a positive integer");

  // Conditional atomic update (only if enough remaining and active)
  const res = await prisma.registration.updateMany({
    where: { email: e, active: true, remainingCredits: { gte: amt } },
    data: {
      consumedCredits: { increment: amt },
      remainingCredits: { decrement: amt },
    },
  });

  if (res.count > 0) {
    return prisma.registration.findUniqueOrThrow({
      where: { email: e },
      select: {
        email: true,
        totalCredits: true,
        consumedCredits: true,
        remainingCredits: true,
        active: true,
      },
    });
  }

  const exists = await prisma.registration.findUnique({
    where: { email: e },
    select: { remainingCredits: true },
  });
  if (!exists) throw Object.assign(new Error("Account not found"), { code: "NO_ACCOUNT" });
  throw Object.assign(new Error("Insufficient credits"), { code: "INSUFFICIENT" });
}
