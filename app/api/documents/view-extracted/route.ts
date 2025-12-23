// app/api/documents/view-extracted/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normEmail = (e: unknown) => String(e || "").toLowerCase().trim();

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

export async function GET(req: Request) {
  try {
    // ---- Identity from cookies ----
    const jar = parseCookieHeader(req.headers.get("cookie"));
    const email = normEmail(jar.get("agx_email") || jar.get("email") || "");
    const accountId = Number(jar.get("accountId") || 0) || 0;
    if (!email || !accountId) {
      return NextResponse.json({ error: "email & accountId are required" }, { status: 401 });
    }

    // ---- Input ----
    const url = new URL(req.url);
    const id = url.searchParams.get("id") || "";
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    // ---- DB lookup + ownership check ----
    const row = await prisma.document.findFirst({
      where: { id, accountId, email },
      select: {
        id: true,
        originalName: true,
        createdAt: true,
        status: true,
        lastExtractAt: true,
        extractResult: true,
        updatedAt: true,
      },
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const hasExtract = Boolean(row.lastExtractAt || row.extractResult != null);

    return NextResponse.json({
      ok: true,
      doc: {
        id: row.id,
        originalName: row.originalName,
        createdAt: row.createdAt,
        status: row.status,
        lastExtractAt: row.lastExtractAt,
        extractResult: row.extractResult, // whatever you stored (JSON)
        hasExtract,
      },
    });
  } catch (e: any) {
    console.error("view-extracted error:", e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
