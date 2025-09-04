// app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { register } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = { email: string; initialTotal?: number };

function bad(status: number, message: string, code = "BAD_REQUEST") {
  return NextResponse.json({ ok: false, code, error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const { email, initialTotal } = (await req.json()) as Body;

    const e = (email ?? "").trim().toLowerCase();
    if (!e) return bad(400, "Email required", "EMAIL_REQUIRED");

    const init = initialTotal ?? 0;
    if (!Number.isFinite(init) || init < 0 || !Number.isInteger(init)) {
      return bad(400, "initialTotal must be a non-negative integer", "INVALID_INITIAL_TOTAL");
    }

    const data = await register(e, init);
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
