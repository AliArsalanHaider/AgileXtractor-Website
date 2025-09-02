// app/api/credits/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { register } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;


export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const row = await register(email);
  return NextResponse.json({ ok: true, data: row });
}
