// app/api/credits/consume/route.ts
import { NextRequest, NextResponse } from "next/server";
import { consumeForDocs, EXTRACT_COST } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  email: string;
  docs?: number;     // number of documents actually extracted (NOT images/pages)
  ok?: boolean;      // optional: pass false if your extraction failed
  error?: string;    // optional: error message from your extractor
};

function bad(status: number, message: string, code = "BAD_REQUEST") {
  return NextResponse.json({ ok: false, code, error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const { email, docs, ok, error } = (await req.json()) as Body;

    const e = (email ?? "").trim().toLowerCase();
    if (!e) return bad(400, "Email required", "EMAIL_REQUIRED");

    // If the caller indicates an error, DO NOT CHARGE — just bubble up the message.
    if (ok === false || typeof error === "string") {
      const msg = error || "Extraction failed";
      return NextResponse.json({ ok: false, code: "EXTRACT_ERROR", error: msg }, { status: 400 });
    }

    // Determine how many documents were actually extracted.
    // Default to 1 doc if not provided.
    const docCount = typeof docs === "number" ? Math.floor(docs) : 1;

    const { row, charged } = await consumeForDocs(e, docCount);
    return NextResponse.json(
      { ok: true, data: row, meta: { charged, perDoc: EXTRACT_COST, docs: Math.max(docCount, 0) } },
      { status: 200 }
    );
  } catch (err: unknown) {
    let status = 400;
    let code = "ERROR";
    let message = "Unexpected error";

    if (err && typeof err === "object") {
      const e = err as { code?: string; message?: string };
      if (e.code === "INSUFFICIENT") status = 402;
      if (e.code === "NO_ACCOUNT") status = 404;
      if (e.code) code = e.code;
      if (e.message) message = e.message;
    }

    return NextResponse.json({ ok: false, code, error: message }, { status });
  }
}
