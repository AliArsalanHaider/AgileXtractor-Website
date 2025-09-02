// app/api/credits/add/route.ts
import { NextRequest, NextResponse } from "next/server";
import { addPaidCredits } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;


export async function POST(req: NextRequest) {
  const { email, add } = await req.json();
  if (!email || typeof add !== "number") {
    return NextResponse.json({ error: "email and add required" }, { status: 400 });
  }
  const row = await addPaidCredits(email, add);
  return NextResponse.json({ ok: true, data: row });
}
