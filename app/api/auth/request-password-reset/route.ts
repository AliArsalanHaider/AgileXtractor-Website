import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getTransport } from "@/lib/email"; // we’ll also add sendPasswordResetEmail below

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function randomToken(len = 32) {
  return crypto.randomBytes(len).toString("base64url");
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    // Does the user exist?
    const user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      select: { id: true },
    });

    // Always respond 200 to avoid user enumeration
    if (!user) return NextResponse.json({ ok: true });

    // Remove any previous reset tokens for this email
    await prisma.emailVerifyToken.deleteMany({
      where: {
        identifier: { equals: normalizedEmail, mode: "insensitive" },
        consumedAt: null,
      },
    });

    const raw = randomToken(32);
    const tokenHash = sha256(raw);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.emailVerifyToken.create({
      data: {
        identifier: normalizedEmail,
        tokenHash,
        expires,
      },
    });

    // Build absolute reset URL
    const hdr = new Headers(req.headers);
    const proto = hdr.get("x-forwarded-proto") || "http";
    const host = hdr.get("x-forwarded-host") || hdr.get("host") || "localhost:3000";
    const origin = (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")) || `${proto}://${host}`;
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(raw)}&email=${encodeURIComponent(normalizedEmail)}`;

    // Send email
    const transporter = await getTransport();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM!,
      to: normalizedEmail,
      subject: "Reset your password",
      html: `
        <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif">
          <h2>Password reset</h2>
          <p>Click the button below to set a new password. The link is valid for 1 hour.</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Reset Password</a></p>
          <p>If the button doesn't work, copy and paste this URL:</p>
          <p style="word-break:break-all;"><a href="${resetUrl}">${resetUrl}</a></p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: true }); // still 200 (no info leak)
  }
}
