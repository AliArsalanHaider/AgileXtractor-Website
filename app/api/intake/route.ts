// app/api/intake/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, profile } = (await req.json()) as {
      email?: string;
      profile?: Record<string, any>;
    };

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const existing = await prisma.registration.findUnique({
      where: { email },
      select: { profile: true },
    });

    const prev = (existing?.profile as Record<string, any> | null) ?? {};

    // Shallow merge + explicitly preserve auth
    const mergedProfile = {
      ...prev,
      ...profile,
      auth: prev?.auth ?? undefined, // << keep password hash!
      lastUpdated: new Date().toISOString(),
      selectedAt: prev?.selectedAt ?? profile?.selectedAt ?? new Date().toISOString(),
    };

    await prisma.registration.upsert({
      where: { email },
      create: { email, active: false, profile: mergedProfile },
      update: { active: false, profile: mergedProfile },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("intake error:", e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
