// app/api/credits/consume/route.ts
import { NextRequest, NextResponse } from "next/server";
import { consume } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Accepts:
 *  - { email, docs }    -> charges docs * 100
 *  - OR { email, amount } -> charges fixed amount
 *  - Optional: { ok:false, error:"..." } -> no-op (used by client to report failures; we won't charge)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, docs, amount, ok } = body || {};

    // If client reports an error path, do nothing (no charge)
    if (ok === false) {
      return NextResponse.json({ ok: true, data: null });
    }

    if (!email) return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });

    const row = await consume(email, { docs, amount });
    return NextResponse.json({ ok: true, data: row });
  } catch (err: any) {
    const code = err?.code || "ERROR";
    const status =
      code === "NO_ACCOUNT" ? 404 :
      code === "INSUFFICIENT" ? 402 :
      code === "INACTIVE" ? 403 :
      code === "INVALID_AMOUNT" ? 400 :
      400;

    return NextResponse.json({ ok: false, code, error: err?.message || "error" }, { status });
  }
}
