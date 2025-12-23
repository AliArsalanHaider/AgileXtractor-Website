// app/api/credits/status/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function norm(s: unknown) {
  return String(s ?? "").toLowerCase().trim();
}

function parseCookie(header: string | null) {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // Prefer query param; fall back to cookie header (agx_email/email)
    const cookieJar = parseCookie(req.headers.get("cookie"));
    const email = norm(
      url.searchParams.get("email") ||
      cookieJar["agx_email"] ||
      cookieJar["email"]
    );

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    // Case-insensitive lookup
    const row = await prisma.registration.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: {
        accountId: true,
        email: true,
        totalCredits: true,
        consumedCredits: true,
        remainingCredits: true,
      },
    });

    if (!row) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Normalize stored casing to lowercase (best-effort)
    if (row.email !== email) {
      try {
        await prisma.registration.update({
          where: { accountId: row.accountId },
          data: { email },
        });
      } catch {
        /* ignore races */
      }
    }

    return NextResponse.json({
      total: row.totalCredits,
      used: row.consumedCredits,
      remaining: row.remainingCredits,
    });
  } catch (e) {
    console.error("credits/status error:", e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
