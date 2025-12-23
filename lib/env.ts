// lib/env.ts
type Plan = "FREE" | "BASIC" | "PREMIUM" | "CUSTOM";
type Cycle = "MONTHLY" | "YEARLY";

function intFromEnv(key: string, fallback: number): number {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
}

export function getCostPerDoc(): number {
  return intFromEnv("CREDITS_COST_PER_DOC", 100);
}

export function getMonthlyCredits(plan: Plan): number {
  switch (plan) {
    case "FREE":    return intFromEnv("CREDITS_MONTHLY_FREE", 1000);
    case "BASIC":   return intFromEnv("CREDITS_MONTHLY_BASIC", 10000);
    case "PREMIUM": return intFromEnv("CREDITS_MONTHLY_PREMIUM", 100000);
    case "CUSTOM":  return intFromEnv("CREDITS_MONTHLY_CUSTOM", 25000); // your 4th plan
    default:        return 0;
  }
}

export function getYearlyCredits(plan: Plan): number {
  switch (plan) {
    case "FREE":    return intFromEnv("CREDITS_YEARLY_FREE", 1000);
    case "BASIC":   return intFromEnv("CREDITS_YEARLY_BASIC", 120000);
    case "PREMIUM": return intFromEnv("CREDITS_YEARLY_PREMIUM", 1200000);
    case "CUSTOM":  return intFromEnv("CREDITS_YEARLY_CUSTOM", 300000);
    default:        return 0;
  }
}

/**
 * Decide initial bundle for a user. For now you asked:
 * - New users should use MONTHLY FREE credits
 */
export function getInitialCreditsForNewUser(): number {
  return getMonthlyCredits("FREE");
}
