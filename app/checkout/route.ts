// app/checkout/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Optional defaults via env (server-side):
// e.g. CHECKOUT_DEFAULT_PLAN=basic  CHECKOUT_DEFAULT_CYCLE=yearly
const DEFAULT_PLAN =
  (process.env.CHECKOUT_DEFAULT_PLAN ?? "basic").toLowerCase();
const DEFAULT_CYCLE =
  (process.env.CHECKOUT_DEFAULT_CYCLE ?? "monthly").toLowerCase();

// Normalize "professional" -> "premium" to match the rest of your flow
function normalizePlan(input?: string) {
  const x = (input ?? "").toLowerCase();
  if (x === "professional") return "premium";
  if (x === "premium" || x === "basic" || x === "free") return x;
  return DEFAULT_PLAN;
}

function normalizeCycle(input?: string) {
  const x = (input ?? "").toLowerCase();
  return x === "yearly" ? "yearly" : "monthly";
}

export const GET = async (req: NextRequest) => {
  const url = new URL(req.url);

  // Preserve existing query params, but ensure plan/cycle defaults exist
  const sp = new URLSearchParams(url.search);

  const plan = normalizePlan(sp.get("plan") || undefined);
  const cycle = normalizeCycle(sp.get("cycle") || undefined);

  sp.set("plan", plan);
  sp.set("cycle", cycle);

  // 307 Temporary Redirect preserves method semantics if you ever POST to this URL,
  // but for links it's just a normal redirect.
  const location = `/get-started?${sp.toString()}`;
  return NextResponse.redirect(location, { status: 307 });
};
