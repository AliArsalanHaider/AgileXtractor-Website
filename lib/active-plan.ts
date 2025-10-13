// lib/active-plan.ts
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// Align with your UI names (FREE/BASIC/PREMIUM/ENTERPRISE)
export type PlanName = "FREE" | "BASIC" | "PREMIUM" | "ENTERPRISE";
export type RenewInterval = "monthly" | "yearly";

// Base monthly prices in AED (before yearly discount)
const MONTHLY_AED: Record<PlanName, number | null> = {
  FREE: 0,
  BASIC: 165,
  PREMIUM: 1100,
  ENTERPRISE: null, // contact sales
};

function computePrices(plan: PlanName, renewInterval: RenewInterval) {
  const monthly = MONTHLY_AED[plan];

  if (monthly == null) {
    return { perMonthAED: null as number | null, billedTotalAED: null as number | null };
  }

  if (renewInterval === "monthly") {
    // monthly billing – show per-month; "total" per charge is the same monthly amount
    return { perMonthAED: monthly, billedTotalAED: monthly };
  }

  // yearly: 25% off → store discounted per-month and yearly total
  const perMonthAED = Math.round(monthly * 0.75);
  const billedTotalAED = perMonthAED * 12;
  return { perMonthAED, billedTotalAED };
}

/**
 * Upserts a Registration row and stores the active plan metadata into profile (JSONB).
 * - Merges existing profile JSON (preserves prior fields).
 * - Creates the row if it doesn't exist.
 */
export async function setActivePlan(opts: {
  email: string;
  plan: PlanName;
  renewInterval: RenewInterval;
}) {
  const { email, plan, renewInterval } = opts;

  // Read the current profile so we can merge
  const existing = await prisma.registration.findUnique({
    where: { email },
    select: { profile: true },
  });

  const { perMonthAED, billedTotalAED } = computePrices(plan, renewInterval);
  const nowIso = new Date().toISOString();

  const previousProfile =
    (existing?.profile as Record<string, any> | null | undefined) ?? {};

  // Merge & update plan fields inside the JSON profile only
  const newProfile = {
    ...previousProfile,
    plan,
    planStatus: "ACTIVE",
    renewInterval,
    planPriceAEDPerMonth: perMonthAED,
    billedTotalAED,
    selectedAt: previousProfile?.selectedAt ?? nowIso,
    lastUpdated: nowIso,
  };

  await prisma.registration.upsert({
    where: { email },
    create: {
      email,
      active: true,
      profile: newProfile as Prisma.InputJsonValue,
    },
    update: {
      active: true,
      profile: newProfile as Prisma.InputJsonValue,
    },
  });

  return { ok: true, profile: newProfile };
}
