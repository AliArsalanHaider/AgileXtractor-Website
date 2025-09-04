// app/api/credits/add/route.ts
import { NextRequest, NextResponse } from "next/server";
import { addPaidCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = { email: string; add?: number };

function bad(status: number, message: string, code = "BAD_REQUEST") {
  return NextResponse.json({ ok: false, code, error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const { email, add } = (await req.json()) as Body;

    const e = (email ?? "").trim().toLowerCase();
    if (!e) return bad(400, "Email required", "EMAIL_REQUIRED");

    const amount = Number(add);
    if (!Number.isFinite(amount) || amount <= 0)
      return bad(400, "add must be a positive number", "INVALID_AMOUNT");

    const data = await addPaidCredits(e, Math.floor(amount));
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
