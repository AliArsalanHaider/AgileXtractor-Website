import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs"; // Prisma requires Node runtime

type RegisterBody = { name?: string; email: string; company?: string };

export async function POST(req: NextRequest) {
  const { name, email, company } = (await req.json()) as RegisterBody;

  if (!email) {
    return NextResponse.json({ ok: false, error: "Email required" }, { status: 400 });
  }

  const row = await prisma.registration.upsert({
    where: { email },
    update: { name, company },
    create: { name, email, company }
  });

  return NextResponse.json({ ok: true, row });
}
