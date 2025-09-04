// app/components/Pricing.tsx
"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

  const plans = [
    {
      name: "Basic",
      price: yearly ? 0 : 0,
      features: [
        "50,000 Tokens",
        "Arabic to English Translation available for pre-authenticated trials only",
        "Only 1 user",
        "Export (CSV / Excel)",
        "24/7 Support",
        "Continuous learning",
        "Extract fields",
        "3-month Data Retention",
        "Pre-built Document AI models",
        "AI Integration",
        "Third Party Integrations",
        "Cancel Anytime",
      ],
      highlight: false,
    },
    {
      name: "Professional",
      price: yearly ? 19 : 25,
      features: [
        "400,000 Tokens",
        "Arabic to English Translation available for pre-authenticated trials only",
        "Up to 3 users",
        "Export (CSV / Excel)",
        "24/7 Support",
        "Continuous learning",
        "Extract fields",
        "1 Year Data Retention",
        "Pre-built Document AI models",
        "AI Integration",
        "Third Party Integrations",
        "Cancel Anytime",
      ],
      highlight: true,
    },
    {
      name: "Enterprise",
      price: yearly ? 75 : 100,
      features: [
        "1,500,000 Tokens",
        "Arabic to English Translation available on fields as per requirements",
        "Unlimited users",
        "Export (CSV / Excel)",
        "24/7 Support",
        "Continuous learning",
        "Extract fields",
        "Custom Data Retention",
        "Pre-built Document AI models",
        "AI Integration",
        "Third Party Integrations",
        "Cancel Anytime",
      ],
      highlight: false,
    },
  ];

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-6 sm:px-8 py-12 sm:py-8">
        <h2 className="text-center text-3xl sm:text-5xl font-bold text-gray-900">
          Powerful features for{" "}<br/>
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
          {yearly && (
            <span className="ml-2 text-[#2BAEFF] text-sm font-medium">Save 25%</span>
          )}
        </div>

        {/* Pricing cards */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 shadow-sm flex flex-col ${
                plan.highlight
                  ? "bg-[#2BAEFF] text-white border-[#2BAEFF] scale-105"
                  : "bg-white text-gray-900 border-gray-200"
              }`}
            >
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="mt-4 text-4xl font-bold">
                ${plan.price}
                <span className="text-base font-medium"> /month</span>
              </p>
              <button
                className={`mt-6 rounded-md px-4 py-2 text-center font-medium ${
                  plan.highlight
                    ? "bg-white text-[#2BAEFF] hover:bg-sky-50"
                    : "bg-[#2BAEFF] text-white hover:bg-[#2BAEFF]"
                }`}
              >
                Get Started Now
              </button>
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
          ))}
        </div>
      </div>
    </section>
  );
}
