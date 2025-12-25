// app/api/auth/request-verify/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";

function randomToken(len = 32) {
  return crypto.randomBytes(len).toString("base64url");
}

export async function POST(req: Request) {
  try {
    let email = "";
    const ctype = req.headers.get("content-type") || "";

    if (ctype.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      email = String(body?.email ?? "").trim().toLowerCase();
    } else if (ctype.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      email = String(form.get("email") ?? "").trim().toLowerCase();
    }

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, emailVerified: true },
    });

    // Avoid user enumeration
    if (!user || user.emailVerified) {
      return NextResponse.json({ ok: true });
    }

    await prisma.emailToken.deleteMany({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    const token = randomToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.emailToken.create({
      data: {
        token,
        userId: user.id,
        email,
        expiresAt,
      },
    });

    const hdr = new Headers(req.headers);
    const proto = hdr.get("x-forwarded-proto") || "http";
    const host =
      hdr.get("x-forwarded-host") || hdr.get("host") || "localhost:3000";
    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      `${proto}://${host}`;

    const verifyUrl = `${origin}/api/auth/verify-email?token=${encodeURIComponent(
      token
    )}&email=${encodeURIComponent(email)}`;

    const mail = await sendVerificationEmail(email, verifyUrl);

    // Optional debug log
    console.log("Verification email sent:", mail.messageId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("request-verify error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
