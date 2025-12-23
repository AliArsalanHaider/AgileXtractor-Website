// app/api/documents/download/route.ts
import { prisma } from "@/lib/prisma";
import { promises as fs } from "fs";

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
      return new Response(JSON.stringify({ error: "email & accountId are required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ---- Input ----
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || "";
    if (!id) {
      return new Response(JSON.stringify({ error: "id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ---- DB lookup with ownership check ----
    const row = await prisma.document.findFirst({
      where: { id, accountId, email },
      select: { originalName: true, filePath: true, contentType: true, sizeBytes: true },
    });
    if (!row) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ---- Read file and stream it ----
    const buf = await fs.readFile(row.filePath);
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(u8);
        controller.close();
      },
    });

    const headers = new Headers();
    headers.set("Content-Type", row.contentType || "application/octet-stream");
    headers.set("Content-Length", String(row.sizeBytes ?? u8.byteLength));
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(row.originalName)}"`
    );

    return new Response(stream, { status: 200, headers });
  } catch (e) {
    console.error("download error:", e);
    return new Response(JSON.stringify({ error: "Download failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
