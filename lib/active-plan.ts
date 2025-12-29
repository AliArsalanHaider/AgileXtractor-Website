// lib/active-plan.ts
import { prisma } from "@/lib/prisma";

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
    return { perMonthAED: monthly, billedTotalAED: monthly };
  }

  // yearly: 25% off
  const perMonthAED = Math.round(monthly * 0.75);
  const billedTotalAED = perMonthAED * 12;
  return { perMonthAED, billedTotalAED };
}

/**
 * Upserts a Registration row and stores the active plan metadata into profile (JSONB).
 * - Merges existing profile JSON (preserves prior fields).
 * - Creates the row if it doesn't exist.
 *
 * NOTE: Prisma JSON helper types are not exported in your generated client,
 * so we avoid importing them and use a TS-only assertion for the JSON field.
 * This does NOT change runtime behavior.
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
    (existing?.profile as Record<string, unknown> | null | undefined) ?? {};

  // Merge & update plan fields inside the JSON profile only
  const newProfile = {
    ...previousProfile,
    plan,
    planStatus: "ACTIVE",
    renewInterval,
    planPriceAEDPerMonth: perMonthAED,
    billedTotalAED,
    selectedAt: (previousProfile as { selectedAt?: string } | undefined)?.selectedAt ?? nowIso,
    lastUpdated: nowIso,
  };

  await prisma.registration.upsert({
    where: { email },
    create: {
      email,
      active: true,
      profile: newProfile as unknown as never,
    },
    update: {
      active: true,
      profile: newProfile as unknown as never,
    },
  });

  return { ok: true, profile: newProfile };
}
