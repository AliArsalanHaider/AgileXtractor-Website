// app/api/documents/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normEmail(e: unknown) {
  return String(e || "").toLowerCase().trim();
}

function parseCookieHeader(cookieHeader: string | null) {
  const map = new Map<string, string>();
  if (!cookieHeader) return map;

  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.split("=");
    const key = k?.trim();
    const val = v.join("=").trim();
    if (key) map.set(key, decodeURIComponent(val || ""));
  }
  return map;
}

/**
 * Strict typing without relying on Prisma model exports.
 * Matches your SELECT exactly and keeps behavior unchanged.
 */
type DocRow = {
  id: string;
  originalName: string;
  sizeBytes: number | null;
  contentType: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  lastExtractAt: Date | null;
  extractResult: unknown;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    let email = normEmail(url.searchParams.get("email"));
    let accountId = Number(url.searchParams.get("accountId") || 0) || 0;

    if (!email || !accountId) {
      const cookieJar = parseCookieHeader(req.headers.get("cookie"));
      if (!email) email = normEmail(cookieJar.get("agx_email") || cookieJar.get("email") || "");
      if (!accountId) accountId = Number(cookieJar.get("accountId") || 0) || 0;
    }

    if (!email || !accountId) {
      return NextResponse.json({ error: "email & accountId are required" }, { status: 401 });
    }

    const take = Math.min(Number(url.searchParams.get("take") || 25), 100);

    const docsRaw = (await prisma.document.findMany({
      where: { accountId, email },
      select: {
        id: true,
        originalName: true,
        sizeBytes: true,
        contentType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastExtractAt: true,
        extractResult: true,
      },
      orderBy: { createdAt: "desc" },
      take,
    })) as unknown as DocRow[];

    const docs = docsRaw.map((d: DocRow) => ({
      id: d.id,
      originalName: d.originalName,
      sizeBytes: d.sizeBytes,
      contentType: d.contentType,
      status: d.status,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      lastExtractAt: d.lastExtractAt,
      // the field your UI checks to show the icon:
      hasExtract: Boolean(d.lastExtractAt || d.extractResult != null),
    }));

    return NextResponse.json({ ok: true, docs }, { status: 200 });
  } catch (e: unknown) {
    console.error("documents/list error:", e);
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }
}
