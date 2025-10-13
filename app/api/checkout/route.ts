// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { setActivePlan } from "@/lib/active-plan";

export const runtime = "nodejs";

// If you prefer pinning, upgrade the stripe SDK and add { apiVersion: "2024-06-20" }
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

// Hosted checkout/payment links (your old public envs)
const LINK_MAP: Record<string, string | undefined> = {
  "basic:monthly": process.env.NEXT_PUBLIC_CHECKOUT_BASIC_MONTHLY,
  "basic:yearly": process.env.NEXT_PUBLIC_CHECKOUT_BASIC_YEARLY,
  // professional maps to premium
  "premium:monthly":
    process.env.NEXT_PUBLIC_CHECKOUT_PROFESSIONAL_MONTHLY ||
    process.env.NEXT_PUBLIC_CHECKOUT_PREMIUM_MONTHLY,
  "premium:yearly":
    process.env.NEXT_PUBLIC_CHECKOUT_PROFESSIONAL_YEARLY ||
    process.env.NEXT_PUBLIC_CHECKOUT_PREMIUM_YEARLY,
};

// Optional server-created Checkout Sessions (only if you set these)
const PRICE_MAP: Record<string, string | undefined> = {
  "basic:monthly": process.env.STRIPE_PRICE_BASIC_MONTHLY,
  "basic:yearly": process.env.STRIPE_PRICE_BASIC_YEARLY,
  "premium:monthly": process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  "premium:yearly": process.env.STRIPE_PRICE_PREMIUM_YEARLY,
};

type PlanIn = "free" | "basic" | "premium" | "professional";
type Plan = "free" | "basic" | "premium";
type Cycle = "monthly" | "yearly";

function normalizePlan(p: PlanIn | undefined): Plan {
  const x = (p ?? "basic").toLowerCase();
  if (x === "professional") return "premium";
  if (x === "premium" || x === "basic" || x === "free") return x as Plan;
  return "basic";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const plan: Plan = normalizePlan(body.plan as PlanIn | undefined);
    const cycle = (body.cycle ?? "monthly").toString().toLowerCase() as Cycle;
    const email = (body.email ?? "").toString().trim();
    const profilePayload = body.profile as unknown | undefined; // may be undefined

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    if (cycle !== "monthly" && cycle !== "yearly") {
      return NextResponse.json({ error: "Invalid billing cycle" }, { status: 400 });
    }

    // Build typed create/update payloads; only set profile when provided
    const createPayload: Prisma.RegistrationCreateInput = {
      email,
      active: true,
    };
    if (profilePayload !== undefined) {
      createPayload.profile = profilePayload as Prisma.InputJsonValue;
    }

    const updatePayload: Prisma.RegistrationUpdateInput = {};
    if (profilePayload !== undefined) {
      updatePayload.profile = profilePayload as Prisma.InputJsonValue;
    }

    // Save/Update profile BEFORE payment/activation
    await prisma.registration.upsert({
      where: { email },
      create: createPayload,
      update: updatePayload,
    });

    const origin = req.headers.get("origin") || new URL(req.url).origin;

    // FREE plan → activate immediately (no Stripe)
    if (plan === "free") {
      await setActivePlan({
        email,
        plan: "FREE",
        renewInterval: cycle, // "monthly" | "yearly"
      });
      
      return NextResponse.json(
        { url: `${origin}/api/checkout/success?free=1` },
        { status: 200 }
      );
    }

    // BASIC / PREMIUM → try your hosted links first
    const hostedLink = LINK_MAP[`${plan}:${cycle}`];
    if (hostedLink && hostedLink.startsWith("http")) {
      return NextResponse.json({ url: hostedLink }, { status: 200 });
    }

    // Else create a Stripe Checkout Session (if Price IDs & secret are configured)
    const priceId = PRICE_MAP[`${plan}:${cycle}`];
    if (stripe && priceId) {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: email,
        success_url: `${origin}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/pricing?canceled=1`,
        payment_method_types: ["card"],
        metadata: { userEmail: email, plan, cycle },
        subscription_data: { metadata: { userEmail: email, plan, cycle } },
      });

      

      return NextResponse.json({ url: session.url }, { status: 200 });
    }

    // Nothing configured
    return NextResponse.json(
      {
        error:
          "No checkout link or Stripe price configured. Set NEXT_PUBLIC_CHECKOUT_* envs (preferred) or STRIPE_PRICE_* + STRIPE_SECRET_KEY.",
      },
      { status: 500 }
    );
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 });
  }
}
export async function GET() {
  return NextResponse.json({ ok: true, method: "GET" });
}