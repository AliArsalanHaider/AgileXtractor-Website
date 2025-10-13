// app/components/Pricing.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PLANS, getPriceAED, formatAED, type PlanId, type BillingCycle } from "@/lib/plan";

const checkoutLinks: Record<
  PlanId,
  { monthly?: string; yearly?: string } | undefined
> = {
  free: undefined, // will fall back to in-app route
  basic: {
    monthly: process.env.NEXT_PUBLIC_CHECKOUT_BASIC_MONTHLY,
    yearly: process.env.NEXT_PUBLIC_CHECKOUT_BASIC_YEARLY,
  },
  premium: {
    monthly: process.env.NEXT_PUBLIC_CHECKOUT_PREMIUM_MONTHLY,
    yearly: process.env.NEXT_PUBLIC_CHECKOUT_PREMIUM_YEARLY,
  },
  enterprise: undefined, // handled via calendar/contact
};

function getHref(planId: PlanId, cycle: BillingCycle) {
  if (planId === "enterprise") {
    const meeting = process.env.NEXT_PUBLIC_CALENDAR_URL;
    return meeting && meeting.startsWith("http") ? meeting : "/contact";
  }
  // For free/basic/premium we now go to the intake form
  return `/get-started?plan=${planId}&cycle=${cycle}`;
}

export default function Pricing() {
  const [cycle, setCycle] = useState<BillingCycle>("yearly");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <section id="pricing" className="bg-white" aria-labelledby="pricing-title">
      <div className="mx-auto max-w-6xl px-6 sm:px-8 py-12 sm:py-16">
        <h1 id="pricing-title" className="text-center text-4xl sm:text-5xl font-bold text-gray-900">
          Powerful features for{" "}
          <span className="text-[#2BAEFF]">powerful creators</span>
        </h1>
        <p className="mt-3 text-center text-black">Choose a plan that&apos;s right for you</p>

        {/* Billing cycle toggle */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <span className={cycle === "monthly" ? "font-semibold text-gray-900" : "text-gray-500"}>
            Pay Monthly
          </span>
          <button
            onClick={() => setCycle(cycle === "monthly" ? "yearly" : "monthly")}
            className="relative inline-flex h-6 w-12 items-center rounded-full bg-[#2BAEFF] transition"
            aria-label="Toggle billing cycle"
            aria-pressed={cycle === "yearly"}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                cycle === "yearly" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className={cycle === "yearly" ? "font-semibold text-gray-900" : "text-gray-500"}>
            Pay Yearly
          </span>

          {cycle === "yearly" && (
            <div className="ml-2 relative top-2">
              <Image
                src="/save25prcent.png"
                alt="Save 25% on yearly billing"
                width={120}
                height={40}
                priority
              />
            </div>
          )}
        </div>

        {/* Pricing grid */}
        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const isExpanded = !!expanded[plan.id];
            const hasOverflow = plan.features.length > 10;
            const visible = isExpanded ? plan.features : plan.features.slice(0, 10);

            // Price inputs (guard enterprise which has null)
            const monthlyBase = plan.monthlyPriceAED; // number | null
            const discountedMonthly =
              monthlyBase == null ? null : Math.round(monthlyBase * 0.75); // 25% off per-month display
            const yearlyBilledTotal =
              plan.monthlyPriceAED == null ? null : getPriceAED(plan, "yearly"); // total AED/yr

            const href = getHref(plan.id, cycle);
            const isExternal = href.startsWith("http");

            return (
              <article
                key={plan.id}
                className="group rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col bg-white text-gray-900 transition-colors duration-200 hover:bg-[#2BAEFF] hover:text-white"
                aria-label={`${plan.name} plan`}
              >
                <h2 className="text-l font-semibold">{plan.name}</h2>

                {/* Price display */}
                <div className="mt-4">
                  {plan.id === "enterprise" ? (
                    // Always show GET A QUOTE (no numbers) for enterprise
                    <p className="text-xl font-bold">
                      <span className="text-2xl font-bold tracking-wide">GET A QUOTE</span>
                    </p>
                  ) : cycle === "monthly" ? (
                    <>
                      <p className="text-xl font-bold">
                        <span className="text-3xl font-bold">
                          {formatAED(monthlyBase, "monthly")}
                        </span>
                      </p>
                      <p className="mt-1 text-xs opacity-80">Billed monthly</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl font-bold">
                        <span className="text-3xl font-bold">
                          {formatAED(discountedMonthly, "monthly")}
                        </span>
                      </p>
                      <p className="mt-1 text-xs opacity-80">
                        Billed yearly{" "}
                        <span className="font-medium">
                          {formatAED(yearlyBilledTotal, "yearly")}
                        </span>
                      </p>
                    </>
                  )}
                </div>

                <Link
                  href={href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  className="mt-6 rounded-md px-4 py-2 text-center font-medium bg-[#2BAEFF] text-white transition-colors duration-200 group-hover:bg-white group-hover:text-[#2BAEFF]"
                >
                  {plan.id === "enterprise" ? "GET A QUOTE" : "Get Started"}
                </Link>

                <ul className="mt-6 space-y-3" id={`features-${plan.id}`}>
                  {visible.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-5 w-5 text-[#2BAEFF] transition-colors duration-200 group-hover:text-white" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {hasOverflow && (
                  <button
                    type="button"
                    onClick={() => setExpanded((s) => ({ ...s, [plan.id]: !isExpanded }))}
                    className="mt-4 self-start text-sm font-medium underline text-[#2BAEFF] hover:opacity-90 transition-colors duration-200 group-hover:text-white"
                    aria-expanded={isExpanded}
                    aria-controls={`features-${plan.id}`}
                  >
                    {isExpanded ? "See less" : "See more"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
