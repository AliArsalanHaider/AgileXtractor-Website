// lib/plan.ts
export type PlanId = "free" | "basic" | "premium" | "enterprise";
export type BillingCycle = "monthly" | "yearly";

export interface Plan {
  id: PlanId;
  name: string;
  // monthly price in AED; null means “contact sales”
  monthlyPriceAED: number | null;
  features: string[];
  // purely descriptive; use as you wish in UI
  creditBundle?: number;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Start From",
    monthlyPriceAED: 0,
    features: [
      "1,000 Credits",
      "English Extraction",
      "Process Lengthy Documents",
      "Only 1 user",
      "Export (Text/Doc)",
      "Continuous learning",
      "Cancel Anytime",
    ],
    creditBundle: 1000,
  },
  {
    id: "basic",
    name: "Basic",
    monthlyPriceAED: 165, // per your earlier price guidance
    features: [
      "10,000 Credits",
      "English Extraction",
      "Process Lengthy Documents",
      "Only 1 user",
      "Export (Text/Doc)",
      "Continuous learning",
      "3-month Data Retention",
      "Cancel Anytime",
    ],
    creditBundle: 10000,
  },
  {
    id: "premium",
    name: "Premium",
    monthlyPriceAED: 1100, // per your earlier price guidance
    features: [
      "100,000 Credits",
      "English Extraction",
      "Arabic Extraction",
      "Arabic→English Translation (Pre-defined Fields)",
      "Process Lengthy Documents",
      "Up to 3 users",
      "Export (Text/Doc/CSV/Excel)",
      "Continuous learning",
      "1-Year Data Retention",
      "24/7 Support",
      "Pre-built Document AI Models",
      "Role-based Access Control",
      "Audit Logging",
      "Cancel Anytime",
    ],
    creditBundle: 100000,
  },
  {
    id: "enterprise",
    name: "Enterprise (Customized)",
    monthlyPriceAED: null, // contact sales
    features: [
      "1,000,000+ Credits",
      "English & Arabic Extraction",
      "Arabic→English Translation",
      "API & 3rd-Party Integrations",
      "Auto Document Classification",
      "Document Analytics",
      "Export (Text/Doc/CSV/Excel) ",
      "Role-based Access Control",
      "Continuous learning",
      "Custom Data Retention",
      "Inbox & Email Parsing",
      "24/7 Premium Support",
      "Pre-built Document AI Models",
      "Unlimited Users",
      "Audit Logging",
      "Process Lengthy Documents",
      "Custom Fine-tune Models",
      "Test Environment",
      "Cancel Anytime",
    ],
    creditBundle: 1_000_000,
  },
];

// 25% off yearly helper
export function getPriceAED(plan: Plan, cycle: BillingCycle): number | null {
  if (plan.monthlyPriceAED == null) return null;
  if (cycle === "monthly") return plan.monthlyPriceAED;
  // yearly = 12 months with 25% off
  return Math.round(plan.monthlyPriceAED * 12 * 0.75);
}

export function formatAED(value: number | null, cycle: BillingCycle): string {
  if (value === null) return "Get a Quote";
  return `AED ${value.toLocaleString()}${cycle === "monthly" ? "/mo" : "/yr"}`;
}
