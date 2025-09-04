// app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { register as registerCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
    }

    const data = await registerCredits(email); // ✅ only one argument
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (err: any) {
    const code = err?.code || "ERROR";
    const status = code === "INVALID_EMAIL" ? 400 : 400;
    return NextResponse.json({ ok: false, code, error: err?.message || "error" }, { status });
  }
}
