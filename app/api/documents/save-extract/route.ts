// app/api/documents/save-extract/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const norm = (s: unknown) => String(s || "").trim().toLowerCase();
function parseCookieHeader(h: string | null) {
  const m = new Map<string,string>();
  if (!h) return m;
  for (const p of h.split(";")) {
    const [k, ...v] = p.split("=");
    const key = k?.trim();
    const val = v.join("=").trim();
    if (key) m.set(key, decodeURIComponent(val || ""));
  }
  return m;
}

export async function POST(req: Request) {
  try {
    const jar = parseCookieHeader(req.headers.get("cookie"));
    const email = norm(jar.get("agx_email") || jar.get("email") || "");
    const accountId = Number(jar.get("accountId") || 0) || 0;
    if (!email || !accountId) {
      return NextResponse.json({ error: "email & accountId are required" }, { status: 401 });
    }

    const body = await req.json();
    const sha256 = String(body?.sha256 || "");
    const extractResult = body?.extractResult ?? null;
    if (!sha256 || extractResult == null) {
      return NextResponse.json({ error: "sha256 and extractResult are required" }, { status: 400 });
    }

    // find latest doc for this user with same sha256
    const doc = await prisma.document.findFirst({
      where: { accountId, email, sha256 },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!doc) {
      return NextResponse.json({ error: "No matching document found" }, { status: 404 });
    }

    await prisma.document.update({
      where: { id: doc.id },
      data: {
        extractResult,
        lastExtractAt: new Date(),
        status: "READY",
      },
    });

    return NextResponse.json({ ok: true, id: doc.id });
  } catch (e) {
    console.error("save-extract error:", e);
    return NextResponse.json({ error: "Failed to save extraction" }, { status: 500 });
  }
}
