// lib/active-plan.ts
import {prisma} from "@/lib/prisma";

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
    return {
      perMonthAED: null,
      billedTotalAED: null,
    };
  }

  if (renewInterval === "monthly") {
    return {
      perMonthAED: monthly,
      billedTotalAED: monthly, // charged monthly
    };
  }

  // Yearly: 25% off (store per-month after discount and the yearly total)
  const perMonthAED = Math.round(monthly * 0.75);
  const billedTotalAED = perMonthAED * 12;
  return { perMonthAED, billedTotalAED };
}

/**
 * Stores the active plan inside Registration.profile (JSONB).
 * - Merges existing profile JSON (keeps prior fields).
 * - Creates the registration row if it doesn't exist yet.
 */
export async function setActivePlan(opts: {
  email: string;
  plan: PlanName;
  renewInterval: RenewInterval;
}) {
  const { email, plan, renewInterval } = opts;

  // Fetch current profile to merge
  const existing = await prisma.registration.findUnique({
    where: { email },
    select: { profile: true },
  });

  const { perMonthAED, billedTotalAED } = computePrices(plan, renewInterval);
  const now = new Date().toISOString();

  const previousProfile =
    (existing?.profile as Record<string, any> | null | undefined) ?? {};

  const newProfile = {
    ...previousProfile,
    plan,
    planStatus: "ACTIVE",
    renewInterval,
    // UI-friendly fields you can read anywhere:
    planPriceAEDPerMonth: perMonthAED,
    billedTotalAED,
    selectedAt: previousProfile?.selectedAt ?? now,
    lastUpdated: now,
  };

  // upsert using JSON profile only (no unknown top-level fields)
  await prisma.registration.upsert({
    where: { email },
    create: {
      email,
      active: true,
      profile: newProfile,
      // other numeric columns use defaults from the Prisma model
    },
    update: {
      active: true,
      profile: newProfile,
      // updatedAt is @updatedAt, so we don't set it manually
    },
  });

  return { ok: true, profile: newProfile };
}
