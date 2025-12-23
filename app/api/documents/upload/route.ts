import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { promises as fs } from "fs";
import { makeTargetPath } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normEmail = (e: unknown) => String(e || "").toLowerCase().trim();
const parseCookieHeader = (h: string | null) => {
  const m = new Map<string,string>();
  if (!h) return m;
  for (const p of h.split(";")) {
    const [k, ...v] = p.split("=");
    const key = k?.trim();
    const val = v.join("=").trim();
    if (key) m.set(key, decodeURIComponent(val || ""));
  }
  return m;
};

export async function POST(req: Request) {
  try {
    // identity from cookies
    const jar = parseCookieHeader(req.headers.get("cookie"));
    const email = normEmail(jar.get("agx_email") || jar.get("email") || "");
    const accountId = Number(jar.get("accountId") || 0) || 0;
    if (!email || !accountId) {
      return NextResponse.json({ error: "email & accountId are required" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const sha256 = crypto.createHash("sha256").update(buf).digest("hex");

    const { absPath } = await makeTargetPath(accountId, file.name);
    await fs.writeFile(absPath, buf);

    const created = await prisma.document.create({
      data: {
        accountId,
        email,
        originalName: file.name,
        filePath: absPath,
        contentType: file.type || "application/octet-stream",
        sizeBytes: buf.length,
        sha256,
        status: "READY",
      },
      select: { id: true, originalName: true, sizeBytes: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, doc: created });
  } catch (e) {
    console.error("upload error:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
