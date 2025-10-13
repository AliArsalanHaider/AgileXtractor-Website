// lib/activate-plan.ts
import { prisma } from "@/lib/prisma";

type PlanName = "FREE" | "BASIC" | "PREMIUM" | "ENTERPRISE";
type Cycle = "monthly" | "yearly";

// credits per purchase cycle
const CREDITS_PER_PLAN: Record<PlanName, number> = {
  FREE: 1000,
  BASIC: 10000,
  PREMIUM: 100000,
  ENTERPRISE: 1_000_000,
};

function addMonths(d: Date, m: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x;
}

export async function activatePlanForEmail(
  email: string,
  plan: PlanName,
  cycle: Cycle,
  payment?: {
    provider?: string;
    customerId?: string;
    subscriptionId?: string;
    lastInvoiceId?: string;
  }
) {
  const grant = CREDITS_PER_PLAN[plan];
  const now = new Date();
  const expires = cycle === "yearly" ? addMonths(now, 12) : addMonths(now, 1);

  return prisma.registration.update({
    where: { email },
    data: {
      plan,
      planStatus: "ACTIVE",
      planPriceAED:
        plan === "BASIC" ? 165 :
        plan === "PREMIUM" ? 1100 :
        0,
      allocatedCredits: grant,
      renewInterval: cycle,
      planStartedAt: now,
      planExpiresAt: expires,
      lastTopUpAt: now,
      autoRenew: true,
      paymentProvider: payment?.provider,
      paymentCustomerId: payment?.customerId,
      paymentSubscriptionId: payment?.subscriptionId,
      paymentLastInvoiceId: payment?.lastInvoiceId,
      totalCredits:     { increment: grant },
      remainingCredits: { increment: grant },
    },
  });
}
