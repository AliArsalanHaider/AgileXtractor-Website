// app/api/credits/consume/route.ts
import { NextRequest, NextResponse } from "next/server";
import { consume } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || "");
    if (!email) {
      return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
    }

    // Accept either { docs } or { amount } or { ok:false } (no charge)
    const docs = body?.docs;
    const amount = body?.amount;
    const ok = body?.ok;

    const data = await consume(email, { docs, amount, ok });
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (err: any) {
    const code = err?.code || "ERROR";
    const status =
      code === "INSUFFICIENT" ? 402 :
      code === "NO_ACCOUNT" ? 404 :
      code === "INVALID_EMAIL" ? 400 : 400;

    return NextResponse.json(
      { ok: false, code, error: err?.message || "error" },
      { status }
    );
  }
}
