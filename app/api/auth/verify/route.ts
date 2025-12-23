// app/api/auth/verify/route.ts
import { NextResponse } from "next/server";
import { consumeEmailVerifyToken } from "@/lib/email-verify";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email") || "";
  const token = url.searchParams.get("token") || "";

  if (!email || !token) {
    return NextResponse.redirect(new URL("/(site)/login?error=bad_link", url.origin));
  }

  const ok = await consumeEmailVerifyToken(email, token);
  if (!ok) {
    return NextResponse.redirect(new URL("/(site)/login?error=expired_or_used", url.origin));
  }

  return NextResponse.redirect(new URL("/(site)/login?verified=1", url.origin));
}
