import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getMonthlyCredits } from "@/lib/env";

// optional plan param; default FREE
const bodySchema = z.object({
  email: z.string().email(),
  plan: z.enum(["FREE", "BASIC", "PREMIUM", "CUSTOM"]).optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { email, plan = "FREE" } = bodySchema.parse(json);

    // Always normalize to lowercase for storage
    const normalizedEmail = email.toLowerCase().trim();

    // Case-insensitive lookup so mixed-case inputs hit the same row
    const existing = await prisma.registration.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
      select: {
        email: true,
        accountId: true,
        totalCredits: true,
        consumedCredits: true,
        remainingCredits: true,
      },
    });

    if (existing) {
      // If stored email has different casing, normalize it using a unique key we have (accountId)
      if (existing.email !== normalizedEmail) {
        try {
          await prisma.registration.update({
            where: { accountId: existing.accountId }, // <-- use unique accountId, not id
            data: { email: normalizedEmail },
          });
        } catch {
          // ignore if uniqueness/casing already normalized elsewhere
        }
      }

      return NextResponse.json({
        ok: true,
        total: existing.totalCredits,
        used: existing.consumedCredits,
        remaining: existing.remainingCredits,
        accountId: existing.accountId,
      });
    }

    // Create new row with normalized (lowercase) email
    const total = getMonthlyCredits(plan);
    const created = await prisma.registration.create({
      data: {
        email: normalizedEmail,
        totalCredits: total,
        consumedCredits: 0,
        remainingCredits: total,
        active: true,
      },
      select: {
        accountId: true,
        totalCredits: true,
        consumedCredits: true,
        remainingCredits: true,
      },
    });

    return NextResponse.json({
      ok: true,
      total: created.totalCredits,
      used: created.consumedCredits,
      remaining: created.remainingCredits,
      accountId: created.accountId,
    });
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}
