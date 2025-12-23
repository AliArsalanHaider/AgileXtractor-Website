// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import crypto from "crypto";
import { getInitialCreditsForNewUser } from "@/lib/env";
import { sendVerificationEmail } from "@/lib/email";

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
  password: z.string().min(8).max(128),
});

function randomToken(len = 32) {
  return crypto.randomBytes(len).toString("base64url");
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { email, name, password } = bodySchema.parse(json);
    const normalizedEmail = email.toLowerCase().trim();

    // 1) Block duplicate Registration (your legacy check)
    const alreadyReg = await prisma.registration.findUnique({
      where: { email: normalizedEmail },
      select: { accountId: true },
    });
    if (alreadyReg) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // 2) Upsert User (used for verification + auth)
    const passwordHash = await bcrypt.hash(password, 10);
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      select: { id: true, emailVerified: true },
    });

    let userId: string;
    if (existingUser) {
      const updated = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          name: name ?? undefined,
          status: existingUser.emailVerified ? "active" : "inactive",
        },
        select: { id: true },
      });
      userId = updated.id;
    } else {
      const created = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name: name ?? null,
          status: "inactive",
        },
        select: { id: true },
      });
      userId = created.id;
    }

    // 3) Create initial credits (Registration table) — keep INACTIVE until email verified
    const initTotal = getInitialCreditsForNewUser();
    const reg = await prisma.registration.create({
      data: {
        email: normalizedEmail,
        totalCredits: initTotal,
        consumedCredits: 0,
        remainingCredits: initTotal,
        active: false, // ✅ stay inactive until verification
        profile: {
          ...(name ? { name } : {}),
          passwordHash, // preserve your JSONB practice
        },
      },
      select: {
        accountId: true,
        email: true,
        totalCredits: true,
        consumedCredits: true,
        remainingCredits: true,
      },
    });

    // 4) Issue a 1-hour EmailToken (replace any previous for this email)
    await prisma.emailToken.deleteMany({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    });
    const rawToken = randomToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.emailToken.create({
      data: {
        token: rawToken,
        userId,
        email: normalizedEmail,
        expiresAt,
      },
    });

    // 5) Build absolute verify URL
    const hdr = new Headers(req.headers);
    const proto = hdr.get("x-forwarded-proto") || "http";
    const host = hdr.get("x-forwarded-host") || hdr.get("host") || "localhost:3000";
    const origin =
      (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")) ||
      `${proto}://${host}`;

    const verifyUrl = `${origin}/api/auth/verify-email?token=${encodeURIComponent(
      rawToken
    )}&email=${encodeURIComponent(normalizedEmail)}`;

    // 6) Send verification email — DO NOT crash if SMTP fails
    //    Nodemailer's SentMessageInfo has .accepted/.rejected (no .ok/.error)
    let mailOk = false;
    try {
      const info = await sendVerificationEmail(normalizedEmail, verifyUrl);
      const accepted = (info as any)?.accepted as string[] | undefined;
      mailOk =
        Array.isArray(accepted) &&
        accepted.some((addr) => addr.toLowerCase() === normalizedEmail);
      if (!mailOk) {
        console.warn("Verification email not accepted by SMTP:", {
          accepted: (info as any)?.accepted,
          rejected: (info as any)?.rejected,
          response: (info as any)?.response,
          messageId: (info as any)?.messageId,
        });
      }
    } catch (e) {
      // In dev you also log the verifyUrl — but don’t 500 the signup
      console.warn("Verification email send failed:", e);
      mailOk = false;
    }

    // 7) Respond
    return NextResponse.json(
      {
        ok: true,
        user: {
          id: userId,
          email: reg.email,
          name: name || null,
        },
        credits: {
          total: reg.totalCredits,
          used: reg.consumedCredits,
          remaining: reg.remainingCredits,
        },
        verifySent: mailOk, // UI can optionally show “check your email”
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    console.error("signup route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
