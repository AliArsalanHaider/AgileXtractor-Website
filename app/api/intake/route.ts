// app/api/intake/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
// Use RELATIVE path to avoid alias issues in some setups
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlanIn = "free" | "basic" | "premium" | "professional";
type Plan = "free" | "basic" | "premium";
type Cycle = "monthly" | "yearly";

function normalizePlan(p?: string): Plan {
  const x = (p ?? "").toLowerCase();
  if (x === "professional") return "premium";
  if (x === "premium" || x === "basic" || x === "free") return x as Plan;
  return "basic";
}
function normalizeCycle(c?: string): Cycle {
  return (c ?? "monthly").toLowerCase() === "yearly" ? "yearly" : "monthly";
}

export const POST = async (req: NextRequest) => {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      plan?: PlanIn;
      cycle?: Cycle;
      profile?: Record<string, unknown> | null | undefined;
    };

    const email = (body.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const plan = normalizePlan(body.plan);
    const cycle = normalizeCycle(body.cycle);

    // Ensure JSON-serializable, embed selected plan/cycle under profile.interest
    const profileCombined = {
      ...(body.profile ?? {}),
      interest: {
        plan,
        cycle,
        capturedAt: new Date().toISOString(),
      },
    };

    // ✅ IMPORTANT: only write fields that actually exist in your model
    const createPayload: Prisma.RegistrationCreateInput = {
      email,
      active: true,
      profile: profileCombined as Prisma.InputJsonValue,
    };

    const updatePayload: Prisma.RegistrationUpdateInput = {
      profile: profileCombined as Prisma.InputJsonValue,
    };

    await prisma.registration.upsert({
      where: { email },
      create: createPayload,
      update: updatePayload,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Intake save error:", err);
    return NextResponse.json({ error: "Unable to save" }, { status: 500 });
  }
};
