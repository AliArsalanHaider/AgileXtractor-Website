import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function exchangeCodeForTokens(code: string) {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    grant_type: "authorization_code",
  });

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Google token exchange failed: ${t}`);
  }
  return r.json() as Promise<{
    id_token: string;
    access_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
    refresh_token?: string;
  }>;
}

async function fetchUserInfo(accessToken: string) {
  const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Google userinfo failed: ${t}`);
  }
  return r.json() as Promise<{
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  }>;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state") || "/dashboard";

    if (!code) {
      return NextResponse.redirect(`/login?error=google_no_code`);
    }

    // 1) Exchange code → tokens
    const tokens = await exchangeCodeForTokens(code);

    // 2) Get profile
    const profile = await fetchUserInfo(tokens.access_token);
    const email = (profile.email || "").toLowerCase().trim();
    if (!email) {
      return NextResponse.redirect(`/login?error=google_no_email`);
    }

    // 3) Upsert user. Your schema requires passwordHash, so generate one.
    const displayName = profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(" ");
    const randomHash = await bcrypt.hash(`google:${profile.sub}:${Date.now()}`, 10);

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: randomHash,
          name: displayName || null,
          status: "active",            // activate
          emailVerified: new Date(),   // mark verified
        },
      });
    } else {
      // ensure verified + keep active
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: user.name ?? (displayName || null),
          status: "active",
          emailVerified: user.emailVerified ?? new Date(),
        },
      });
    }

    // 4) Also ensure Registration row exists but stays consistent
    // If you prefer to auto-create Registration on first login:
    const reg = await prisma.registration.findUnique({ where: { email } });
    if (!reg) {
      await prisma.registration.create({
        data: {
          email,
          totalCredits: 0,
          consumedCredits: 0,
          remainingCredits: 0,
          active: true, // user is verified via Google
          profile: { name: displayName || email.split("@")[0] },
        },
      });
    } else {
      // flip active true if you want Registration to mirror user status
      if (!reg.active) {
        await prisma.registration.update({
          where: { email },
          data: { active: true },
        });
      }
    }

    // 5) Create your session (replace with your existing session logic)
    // Here we only set a minimal hint cookie; ideally call your real session creator.
    const res = NextResponse.redirect(state);
    res.cookies.set("agx_email", email, {
      httpOnly: false,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 15, // 15 days
    });

    // If you already have an auth_session cookie creator, call it here instead
    // and set the proper HttpOnly session cookie(s).

    return res;
  } catch (e: any) {
    console.error("google callback error:", e);
    return NextResponse.redirect(`/login?error=google_callback_failed`);
  }
}
