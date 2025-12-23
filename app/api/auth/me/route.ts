import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Small, safe cookie reader for the agx_email value
function readSessionEmailFromCookie(req: Request): string | null {
  const cookie = req.headers.get("cookie") || "";
  // parse semi-colon separated cookies robustly
  const parts = cookie.split(";").map(s => s.trim());
  const entry = parts.find(p => p.startsWith("agx_email="));
  if (!entry) return null;
  const raw = entry.slice("agx_email=".length);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw || null;
  }
}

export async function GET(req: Request) {
  try {
    const email = readSessionEmailFromCookie(req);
    if (!email) {
      return new NextResponse(JSON.stringify({ email: null }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    const row = await prisma.registration.findUnique({
      where: { email },
      select: { profile: true },
    });

    const profile = (row?.profile as Record<string, any> | null) ?? {};
    const firstName: string | null = profile?.firstName ?? null;
    const plan = profile?.plan ?? null;               // e.g. "FREE" | "BASIC" | "PREMIUM"
    const renewInterval = profile?.renewInterval ?? null; // "monthly" | "yearly"

    // Return both firstName and a `name` alias for UI convenience
    const body = {
      email,             // keep for server-side logic
      firstName,         // explicit field
      name: firstName,   // UI can read `name` directly
      plan,
      renewInterval,
      profile,
    };

    return new NextResponse(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("me endpoint error:", e);
    return new NextResponse(JSON.stringify({ email: null }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
}
