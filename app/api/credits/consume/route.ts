import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getCostPerDoc } from "@/lib/env";

const bodySchema = z.object({
  email: z.string().email(),
  amount: z.number().int().min(1).optional(), // if omitted, we’ll use cost-per-doc
});

export async function POST(req: Request) {
  try {
    const { email, amount } = bodySchema.parse(await req.json());
    const normalizedEmail = email.toLowerCase().trim();
    const debit = typeof amount === "number" ? amount : getCostPerDoc();

    const row = await prisma.registration.findUnique({ where: { email: normalizedEmail } });
    if (!row) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const consumed = row.consumedCredits + debit;
    const remaining = Math.max(row.totalCredits - consumed, 0);

    const updated = await prisma.registration.update({
      where: { email: normalizedEmail },
      data: { consumedCredits: consumed, remainingCredits: remaining },
      select: { totalCredits: true, consumedCredits: true, remainingCredits: true },
    });

    return NextResponse.json({
      ok: true,
      total: updated.totalCredits,
      used: updated.consumedCredits,
      remaining: updated.remainingCredits,
    });
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}
