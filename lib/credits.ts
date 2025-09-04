// lib/credits.ts
import { prisma } from "@/lib/prisma";

export const FREE_TRIAL_CREDITS = 500;
export const EXTRACT_COST = 100; // cost per extracted document

export type CreditsRow = {
  email: string;
  totalCredits: number;
  consumedCredits: number;
  remainingCredits: number;
  active: boolean;
};

const norm = (email: string) => email.trim().toLowerCase();

export function computeChargeForDocs(docsExtracted: number, costPerDoc = EXTRACT_COST): number {
  const d = Math.floor(Number(docsExtracted));
  if (!Number.isFinite(d) || d <= 0) return 0;           // 0 docs => no charge
  return d * costPerDoc;                                 // 1→100, 2→200, 3→300...
}

/** FIRST signup gets 500 credits; re-signup doesn't top-up */
export async function register(email: string, initialTotal = FREE_TRIAL_CREDITS): Promise<CreditsRow> {
  const e = norm(email);
  return prisma.registration.upsert({
    where: { email: e },
    update: {},
    create: {
      email: e,
      totalCredits: initialTotal,
      consumedCredits: 0,
      remainingCredits: initialTotal,
      active: true,
    },
    select: { email: true, totalCredits: true, consumedCredits: true, remainingCredits: true, active: true },
  });
}

export async function getStatus(email: string): Promise<CreditsRow> {
  const e = norm(email);
  const row = await prisma.registration.findUnique({
    where: { email: e },
    select: { email: true, totalCredits: true, consumedCredits: true, remainingCredits: true, active: true },
  });
  if (!row) throw Object.assign(new Error("Account not found"), { code: "NO_ACCOUNT" });
  return row;
}

export async function addPaidCredits(email: string, amount: number): Promise<CreditsRow> {
  const e = norm(email);
  const amt = Math.floor(Number(amount));
  if (!Number.isFinite(amt) || amt <= 0) throw new Error("Amount must be a positive integer");

  const res = await prisma.registration.updateMany({
    where: { email: e },
    data: { totalCredits: { increment: amt }, remainingCredits: { increment: amt } },
  });

  if (res.count === 0) {
    return prisma.registration.create({
      data: { email: e, totalCredits: amt, consumedCredits: 0, remainingCredits: amt, active: true },
      select: { email: true, totalCredits: true, consumedCredits: true, remainingCredits: true, active: true },
    });
  }

  return prisma.registration.findUniqueOrThrow({
    where: { email: e },
    select: { email: true, totalCredits: true, consumedCredits: true, remainingCredits: true, active: true },
  });
}

/** Base consumer by raw amount (atomic, with balance check) */
export async function consume(email: string, amount: number = EXTRACT_COST): Promise<CreditsRow> {
  const e = norm(email);
  const amt = Math.floor(Number(amount));
  if (!Number.isFinite(amt) || amt <= 0) throw new Error("Amount must be a positive integer");

  const res = await prisma.registration.updateMany({
    where: { email: e, active: true, remainingCredits: { gte: amt } },
    data: { consumedCredits: { increment: amt }, remainingCredits: { decrement: amt } },
  });

  if (res.count > 0) {
    return prisma.registration.findUniqueOrThrow({
      where: { email: e },
      select: { email: true, totalCredits: true, consumedCredits: true, remainingCredits: true, active: true },
    });
  }

  const exists = await prisma.registration.findUnique({
    where: { email: e },
    select: { remainingCredits: true },
  });
  if (!exists) throw Object.assign(new Error("Account not found"), { code: "NO_ACCOUNT" });

  throw Object.assign(
    new Error("You’ve run out of credits. Please purchase a plan to continue."),
    { code: "INSUFFICIENT" }
  );
}

/** Convenience: consume based on # of documents extracted */
export async function consumeForDocs(email: string, docsExtracted: number): Promise<{ row: CreditsRow; charged: number }> {
  const amount = computeChargeForDocs(docsExtracted);
  if (amount <= 0) {
    // No charge if 0 docs were extracted
    const row = await getStatus(email);
    return { row, charged: 0 };
  }
  const row = await consume(email, amount);
  return { row, charged: amount };
}
