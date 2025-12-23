// app/api/auth/ping/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  // Always return valid JSON so callers never crash on JSON.parse
  return NextResponse.json({ ok: true, ts: Date.now() }, { status: 200 });
}

export async function POST() {
  return GET();
}
