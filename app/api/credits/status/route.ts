// app/api/credits/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getStatus } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function bad(status: number, message: string, code = "BAD_REQUEST") {
  return NextResponse.json({ ok: false, code, error: message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const emailParam = req.nextUrl.searchParams.get("email") ?? "";
    const email = emailParam.trim().toLowerCase();
    if (!email) return bad(400, "Email required", "EMAIL_REQUIRED");

    const data = await getStatus(email);
    // getStatus throws NO_ACCOUNT if missing; if it returns, we’re good
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (err: unknown) {
    let status = 400;
    let code = "ERROR";
    let message = "Unexpected error";

    if (err && typeof err === "object") {
      const e = err as { code?: string; message?: string };
      if (e.code === "NO_ACCOUNT") status = 404;
      if (e.code) code = e.code;
      if (e.message) message = e.message;
    }

    return NextResponse.json({ ok: false, code, error: message }, { status });
  }
}
