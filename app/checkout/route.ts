// app/checkout/route.ts
import { NextResponse } from "next/server";

export const runtime = "edge"; // fast & Vercel-friendly
export const dynamic = "force-dynamic"; // we read query params

type Plan = "free" | "basic" | "premium";
type PlanIn = Plan | "professional";
type Cycle = "monthly" | "yearly";

// Map “professional” -> “premium”, otherwise clamp to allowed values
function normalizePlan(input?: string): Plan {
  const x = (input ?? "").toLowerCase() as PlanIn;
  if (x === "professional") return "premium";
  if (x === "premium" || x === "basic" || x === "free") return x;
  // optional defaults via env
  const def = (process.env.CHECKOUT_DEFAULT_PLAN ?? "basic").toLowerCase();
  return (["free", "basic", "premium"].includes(def) ? def : "basic") as Plan;
}

function normalizeCycle(input?: string): Cycle {
  const x = (input ?? "").toLowerCase();
  if (x === "yearly") return "yearly";
  const def = (process.env.CHECKOUT_DEFAULT_CYCLE ?? "monthly").toLowerCase();
  return def === "yearly" ? "yearly" : "monthly";
}

export function GET(req: Request) {
  const url = new URL(req.url);
  const sp = new URLSearchParams(url.search);

  // normalize plan/cycle while preserving any other query params
  const plan = normalizePlan(sp.get("plan") || undefined);
  const cycle = normalizeCycle(sp.get("cycle") || undefined);
  sp.set("plan", plan);
  sp.set("cycle", cycle);

  // build a safe, same-origin relative redirect to the intake page
  const to = new URL("/get-started", url.origin);
  to.search = sp.toString();

  const res = NextResponse.redirect(to, { status: 307 });
  // SEO: avoid indexing this utility redirect
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}
