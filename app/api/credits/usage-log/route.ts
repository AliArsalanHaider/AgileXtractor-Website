// app/api/credits/usage-log/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toISO(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email") || undefined;
  const accountId = url.searchParams.get("accountId") || undefined;

  // Default: last 30 days
  const days = Math.max(1, Math.min(60, Number(url.searchParams.get("days") || 30)));
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);

  // If you don't yet have a CreditUsage model/table, return empty so UI doesn't 404
  const hasPrismaModel =
    (prisma as any).creditUsage &&
    typeof (prisma as any).creditUsage.findMany === "function";

  if (!hasPrismaModel) {
    return NextResponse.json(
      { items: [], source: "none" },
      { status: 200 }
    );
  }

  try {
    const items = await (prisma as any).creditUsage.findMany({
      where: {
        ...(email ? { email: { equals: email, mode: "insensitive" } } : {}),
        ...(accountId ? { accountId } : {}),
        occurredAt: { gte: since },
      },
      select: { amount: true, occurredAt: true },
      orderBy: { occurredAt: "asc" },
    });

    // Aggregate by UTC day (client can re-bucket to local if needed)
    const byDay: Record<string, number> = {};
    for (const it of items) {
      const iso = toISO(new Date(it.occurredAt));
      byDay[iso] = (byDay[iso] ?? 0) + Number(it.amount || 0);
    }

    // Return a dense range (0-filled) so charts are smooth
    const out: Array<{ iso: string; value: number }> = [];
    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);

    const cur = new Date(since);
    while (cur <= end) {
      const iso = toISO(cur);
      out.push({ iso, value: byDay[iso] ?? 0 });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    return NextResponse.json(
      { items: out, source: "db" },
      { status: 200 }
    );
  } catch (e) {
    // If the table exists but query fails, don’t break the UI
    return NextResponse.json(
      { items: [], source: "error", error: (e as Error)?.message },
      { status: 200 }
    );
  }
}
