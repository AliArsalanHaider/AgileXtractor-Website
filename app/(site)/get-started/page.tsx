// app/get-started/page.tsx
// SERVER COMPONENT — no "use client"

import GetStartedClient from "./GetStartedClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RawParams = Record<string, string | string[] | undefined>;

function one(sp: RawParams, key: string, fallback: string) {
  const v = sp[key];
  if (Array.isArray(v)) return v[0] ?? fallback;
  return (v as string | undefined) ?? fallback;
}

function normalizePlan(p0: string): "free" | "basic" | "premium" {
  const p = p0.toLowerCase();
  if (p === "professional") return "premium";
  if (p === "free" || p === "basic" || p === "premium") return p;
  return "basic";
}

function normalizeCycle(c0: string): "monthly" | "yearly" {
  const c = c0.toLowerCase();
  return c === "yearly" ? "yearly" : "monthly";
}

export default async function Page({
  searchParams,
}: {
  // Next.js 15: searchParams is a Promise in server components
  searchParams?: Promise<RawParams>;
}) {
  const sp: RawParams = (await searchParams) ?? {};
  const plan = normalizePlan(one(sp, "plan", "basic"));
  const cycle = normalizeCycle(one(sp, "cycle", "monthly"));

  return <GetStartedClient plan={plan} cycle={cycle} />;
}
