import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Optional: if you want to seed credits for brand-new Google users
import { getInitialCreditsForNewUser } from "@/lib/env";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// tiny helper to normalize emails like the rest of your code
function normalizeEmail(e: string) {
  return (e || "").toLowerCase().trim();
}

// non-HttpOnly “hints” your header/UI already uses
function setIdentityHints(resp: NextResponse, email: string, name: string | null) {
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  resp.cookies.set("email", email, { path: "/", maxAge });
  if (name) resp.cookies.set("displayName", name, { path: "/", maxAge });
}

export async function POST(req: NextRequest) {
  try {
    const { credential } = await req.json();

    if (!credential) {
      return NextResponse.json({ error: "Missing Google credential" }, { status: 400 });
    }

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload) {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
    }

    const email = normalizeEmail(payload.email || "");
    const emailVerified = Boolean(payload.email_verified);
    const name = payload.name || null;

    if (!email) {
      return NextResponse.json({ error: "Email not present in Google token" }, { status: 400 });
    }
    if (!emailVerified) {
      // Usually Google gives verified emails for normal accounts, but we guard anyway
      return NextResponse.json({ error: "Google email is not verified" }, { status: 403 });
    }

    // Find user by email (case-insensitive)
    let user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (!user) {
      // Create a random password to satisfy your required passwordHash field
      const randomPassword = crypto.randomBytes(24).toString("hex");
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,         // ✅ required by your Prisma schema
          status: "active",      // Google login → treat as verified
          emailVerified: new Date(),
        },
      });

      // Ensure Registration row exists (seed credits once), activate it
      const initTotal = getInitialCreditsForNewUser();
      await prisma.registration.upsert({
        where: { email },
        create: {
          email,
          totalCredits: initTotal,
          consumedCredits: 0,
          remainingCredits: initTotal,
          active: true,
          profile: {
            name: name || undefined,
            auth: "google",
          },
        },
        update: {
          active: true,
          profile: {
            name: name || undefined,
            auth: "google",
          },
        },
      });
    } else {
      // If user exists, make sure they're active and marked verified
      if (!user.emailVerified) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date(), status: "active" },
        });
      }
      // Also ensure Registration is active
      await prisma.registration.updateMany({
        where: { email },
        data: { active: true },
      });
    }

    // Build the response and set your UI “hints” (email/displayName) so Header updates instantly
    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: "active",
      },
    });

    setIdentityHints(res, email, name);

    // If you also set an HttpOnly session elsewhere (like /api/auth/login), you can
    // mirror that here. Otherwise, your client can treat this JSON as success and redirect.
    return res;
  } catch (err: any) {
    console.error("google auth error:", err);
    return NextResponse.json({ error: "Google login failed" }, { status: 500 });
  }
}
