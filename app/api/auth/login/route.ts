// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { z } from "zod";

const REMEMBER_AGE = 60 * 60 * 24 * 15; // 15 days

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  remember: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, remember } = bodySchema.parse(body);

    // Always lowercase for comparisons & storage
    const normalizedEmail = email.toLowerCase().trim();

    // Case-insensitive lookup so mixed-case inputs find the same account
    const row = await prisma.registration.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
      select: {
        accountId: true,
        email: true,
        active: true,
        profile: true, // JSONB (object or string)
        totalCredits: true,
        consumedCredits: true,
        remainingCredits: true,
      },
    });

    if (!row) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    if (!row.active) {
      return NextResponse.json({ error: "Account inactive" }, { status: 403 });
    }

    // If the stored email has incorrect casing, normalize it now
    if (row.email !== normalizedEmail) {
      try {
        await prisma.registration.update({
          where: { accountId: row.accountId },
          data: { email: normalizedEmail },
        });
      } catch {
        // ignore if already normalized elsewhere/race
      }
    }

    // Decode profile (may be a JSON string or object)
    let profile: any = row.profile ?? {};
    if (typeof profile === "string") {
      try {
        profile = JSON.parse(profile);
      } catch {
        profile = {};
      }
    }

    // Find a password hash in known locations
    const passHash: string | undefined =
      profile?.auth?.passHash ??
      profile?.passwordHash ??
      profile?.passHash ??
      profile?.password ??
      undefined;

    if (!passHash) {
      return NextResponse.json(
        { error: "Account has no password set. Please sign up again." },
        { status: 400 }
      );
    }

    const ok = await verifyPassword(password, passHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Friendly display name
    const displayName: string =
      (typeof profile?.name === "string" && profile.name.trim()) ||
      normalizedEmail.split("@")[0];

    // Build response
    const res = NextResponse.json({
      ok: true,
      user: {
        id: String(row.accountId),
        email: normalizedEmail,
        name: typeof profile?.name === "string" ? profile.name : null,
      },
      credits: {
        total: row.totalCredits,
        used: row.consumedCredits,
        remaining: row.remainingCredits,
      },
    });

    // Common cookie options
    const commonCookieOpts = {
      path: "/",
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      ...(remember ? { maxAge: REMEMBER_AGE } : {}),
    };

    // Simple session payload (MVP)
    const payload = Buffer.from(
      JSON.stringify({ email: normalizedEmail, ts: Date.now() })
    ).toString("base64url");

    // Server/session + client helper cookies
    res.cookies.set("agx_session", payload, { ...commonCookieOpts, httpOnly: true });
    res.cookies.set("agx_email", normalizedEmail, commonCookieOpts);
    res.cookies.set("accountId", String(row.accountId), commonCookieOpts);
    res.cookies.set("displayName", encodeURIComponent(displayName), commonCookieOpts);

    return res;
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("login error:", err);
    return NextResponse.json(
      { error: "Unexpected error logging in" },
      { status: 500 }
    );
  }
}
