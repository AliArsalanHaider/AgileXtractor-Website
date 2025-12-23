// app/api/auth/set-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const passHash = await hashPassword(password);

    const existing = await prisma.registration.findUnique({
      where: { email },
      select: { profile: true },
    });

    const prevProfile = (existing?.profile as Record<string, any> | null) ?? {};
    const newProfile = {
      ...prevProfile,
      auth: {
        ...(prevProfile?.auth || {}),
        passHash,
        passSetAt: new Date().toISOString(),
      },
    };

    await prisma.registration.upsert({
      where: { email },
      create: {
        email,
        active: true,
        profile: newProfile,
      },
      update: {
        profile: newProfile,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("set-password error:", e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
