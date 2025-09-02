// app/api/credits/consume/route.ts
import { NextRequest, NextResponse } from "next/server";
import { consume } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;


export async function POST(req: NextRequest) {
  const { email, amount = 100 } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  try {
    const row = await consume(email, Number(amount));
    return NextResponse.json({ ok: true, data: row });
  } catch (err: any) {
    const code = err?.code || "ERROR";
    const status = code === "INSUFFICIENT" ? 402 : code === "NO_ACCOUNT" ? 404 : 400;
    return NextResponse.json({ ok: false, code, error: err?.message || "error" }, { status });
  }
}
