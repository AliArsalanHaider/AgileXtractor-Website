// app/components/Pricing.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

  const plans = [
    {
      id: "basic",
      name: "Basic",
      price: yearly ? 45 : 45,
      features: [
        "10,000 Credits",
        "English Extraction ",
        "Process Lengthy Documents",
        "Only 1 user",
        "Export (Text/Doc)",
        "Continuous learning",
        "3-month Data Retention",
        "Cancel Anytime",
      ],
      highlight: false,
    },
    {
      id: "professional",
      name: "Professional",
      price: yearly ? 249 : 299,
      features: [
        "100,000 Credits",
        "English Extraction",
        "Arabic Extraction",
        "Arabic to English Translation (Pre-defined Fields)",
        "Process Lengthy Documents",
        "Up-to 3 users ",
        "Export (Text/Doc / CSV / Excel) ",
        "Continuous learning",
        "1 Year Data Retention",
        "24/7 Support",
        "Pre-built document AI models",
        "Role-based access control",
        "Audit Logging",
        "Cancel Anytime",
      ],
      highlight: true,
    },
    {
      id: "enterprise",
      name: "Enterprise (Customized)",
      price: "Contact Us for Pricing",
      features: [
        "1000,000 credits",
        "English Extraction",
        "Arabic Extraction",
        "Arabic to English Translation (As per requirement)",
        "Process Lengthy Documents",
        "Unlimited Users",
        "Export (Text/Doc / CSV / Excel)",
        "Continuous learning",
        "Custom Data Retention",
        "24/7 Premium Support",
        "Pre-built document AI models",
        "Role-based access control",
        "Audit Logging",
        "API Integration",
        "Third Party Integrations",
        "Custom fine tune models",
        "Inbox and Email Parsing",
        "Auto Document Classification ",
        "Document Analytics",
        "Test Environment",
        "Cancel Anytime",
      ],
      highlight: false,
    },
  ];

  // Secure hosted checkout links (Stripe Payment Links)
  const checkoutLinks: Record<string, { monthly?: string; yearly?: string }> = {
    basic: {
      monthly: process.env.NEXT_PUBLIC_CHECKOUT_BASIC_MONTHLY,
      yearly: process.env.NEXT_PUBLIC_CHECKOUT_BASIC_YEARLY,
    },
    professional: {
      monthly: process.env.NEXT_PUBLIC_CHECKOUT_PROFESSIONAL_MONTHLY,
      yearly: process.env.NEXT_PUBLIC_CHECKOUT_PROFESSIONAL_YEARLY,
    },
    // enterprise handled separately (meeting link)
  };

  // Choose the right secure link per plan & billing mode; fallback to /checkout
  const getHref = (planId: string) => {
    if (planId === "enterprise") {
      const meeting = process.env.NEXT_PUBLIC_CALENDAR_URL;
      return meeting && meeting.length > 0 ? meeting : "#contact";
    }
    const mode = yearly ? "yearly" : "monthly";
    const href = checkoutLinks[planId]?.[mode];
    return href && href.startsWith("http") ? href : `/checkout?plan=${planId}&cycle=${mode}`;
  };

  return (
    <section id="pricing" className="bg-white">
      <div className="mx-auto max-w-6xl px-6 sm:px-8 py-12 sm:py-8">
        <h2 className="text-center text-3xl sm:text-5xl font-bold text-gray-900">
          Powerful features for <br />
          <span className="text-[#2BAEFF]">powerful creators</span>
        </h2>
        <p className="mt-3 text-center text-black">
          Choose a plan {"that's"} right for you
        </p>

        {/* Toggle */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <span className={!yearly ? "font-semibold text-gray-900" : "text-gray-500"}>
            Pay Monthly
          </span>
          <button
            onClick={() => setYearly(!yearly)}
            className="relative inline-flex h-6 w-12 items-center rounded-full bg-[#2BAEFF] transition"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                yearly ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className={yearly ? "font-semibold text-gray-900" : "text-gray-500"}>
            Pay Yearly
          </span>

          {/* When yearly is ON, show the image slightly lower (replaces "Save 25%") */}
          {yearly && (
            <div className="ml-2 relative top-2">
              <Image
                src="/save25prcent.png" // place this file in /public
                alt="Save 25%"
                width={120}
                height={40}
                priority
              />
            </div>
          )}
        </div>

        {/* Pricing cards */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const href = getHref(plan.id);
            const isExternal = href.startsWith("http");

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 shadow-sm flex flex-col ${
                  plan.highlight
                    ? "bg-[#2BAEFF] text-white border-[#2BAEFF] scale-105"
                    : "bg-white text-gray-900 border-gray-200"
                }`}
              >
                <h3 className="text-xl font-semibold">{plan.name}</h3>

                {/* Price (numeric shows $ + /month, string shows just the text) */}
                {typeof plan.price === "number" ? (
                  <p className="mt-4 text-4xl font-bold">
                    ${plan.price}
                    <span className="text-base font-medium"> /month</span>
                  </p>
                ) : (
                  <p className="mt-4 text-2xl font-semibold">{plan.price}</p>
                )}

                {/* Buttons:
                    - Basic/Professional: Stripe Payment Link (new tab) or fallback to /checkout
                    - Enterprise: Meeting link (calendar URL or #contact)
                 */}
                <a
                  href={href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  className={`mt-6 rounded-md px-4 py-2 text-center font-medium ${
                    plan.highlight
                      ? "bg-white text-[#2BAEFF] hover:bg-sky-50"
                      : "bg-[#2BAEFF] text-white hover:bg-[#2BAEFF]"
                  }`}
                >
                  Get Started Now
                </a>

                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2
                        className={`h-5 w-5 ${
                          plan.highlight ? "text-white" : "text-[#2BAEFF]"
                        }`}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
