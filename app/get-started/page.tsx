// app/get-started/page.tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import GetStartedClient from "./GetStartedClient";

export const metadata: Metadata = {
  title: "Get Started",
  description: "Tell us a few details so we can set up your AgileXtract plan.",
  robots: { index: false, follow: false }, // optional: this page isn’t useful to index
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = { plan?: string; cycle?: string };

function normalizePlan(p?: string) {
  const x = (p ?? "basic").toLowerCase();
  if (x === "professional") return "premium";
  return ["free", "basic", "premium"].includes(x) ? x : "basic";
}

function normalizeCycle(c?: string) {
  const x = (c ?? "monthly").toLowerCase();
  return x === "yearly" ? "yearly" : "monthly";
}

export default function Page({ searchParams }: { searchParams?: SearchParams }) {
  const plan = normalizePlan(searchParams?.plan);
  const cycle = normalizeCycle(searchParams?.cycle) as "monthly" | "yearly";

  return (
    <Suspense fallback={<div className="py-16 text-center">Loading…</div>}>
      <GetStartedClient initialPlan={plan} initialCycle={cycle} />
    </Suspense>
  );
}
