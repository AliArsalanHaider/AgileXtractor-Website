// app/api/credits/consume/route.ts
import { NextRequest, NextResponse } from "next/server";
import { consume } from "@/lib/credits"; // must throw { code: 'INSUFFICIENT' | 'NO_ACCOUNT', message: string } on errors

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ConsumeBody = { email: string; amount?: number };

function bad(status: number, message: string, code = "BAD_REQUEST") {
  return NextResponse.json({ ok: false, code, error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ConsumeBody;

    const email = (body.email ?? "").trim().toLowerCase();
    const amountRaw = body.amount ?? 100;
    const amount = Number(amountRaw);

    if (!email) return bad(400, "Email required", "EMAIL_REQUIRED");
    if (!Number.isFinite(amount) || amount <= 0)
      return bad(400, "Amount must be a positive number", "INVALID_AMOUNT");

    const amt = Math.floor(amount);

    const row = await consume(email, amt);

    return NextResponse.json({ ok: true, data: row }, { status: 200 });
  } catch (err: unknown) {
    // Map your service-layer error codes to HTTP statuses
    let code = "ERROR";
    let status = 400;
    let message = "Unexpected error";

    if (err && typeof err === "object") {
      const e = err as { code?: string; message?: string };
      if (e.code) {
        code = e.code;
        if (code === "INSUFFICIENT") status = 402; // Payment Required-esque for not enough credits
        else if (code === "NO_ACCOUNT") status = 404;
      }
      if (e.message) message = e.message;
    }

    return NextResponse.json({ ok: false, code, error: message }, { status });
  }
}
