// app/api/documents/delete/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { promises as fs } from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normEmail(e: unknown) {
  return String(e || "").toLowerCase().trim();
}

function parseCookieHeader(h: string | null) {
  const m = new Map<string, string>();
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
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // identity guard
    const jar = parseCookieHeader(req.headers.get("cookie"));
    const email = normEmail(jar.get("agx_email") || jar.get("email") || "");
    const accountId = Number(jar.get("accountId") || 0) || 0;
    if (!email || !accountId) {
      return NextResponse.json({ error: "email & accountId are required" }, { status: 401 });
    }

    const row = await prisma.document.findFirst({
      where: { id, accountId, email },
      select: { filePath: true },
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // best-effort remove file
    try {
      await fs.unlink(row.filePath);
    } catch {}

    await prisma.document.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("documents/delete error:", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
