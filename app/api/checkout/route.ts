// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { setActivePlan } from "@/lib/active-plan";

export const runtime = "nodejs";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

/* Hosted checkout links */
const LINK_MAP: Record<string, string | undefined> = {
  "basic:monthly": process.env.NEXT_PUBLIC_CHECKOUT_BASIC_MONTHLY,
  "basic:yearly": process.env.NEXT_PUBLIC_CHECKOUT_BASIC_YEARLY,
  "premium:monthly":
    process.env.NEXT_PUBLIC_CHECKOUT_PROFESSIONAL_MONTHLY ||
    process.env.NEXT_PUBLIC_CHECKOUT_PREMIUM_MONTHLY,
  "premium:yearly":
    process.env.NEXT_PUBLIC_CHECKOUT_PROFESSIONAL_YEARLY ||
    process.env.NEXT_PUBLIC_CHECKOUT_PREMIUM_YEARLY,
};

/* Subscription price IDs */
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

/* -------------------------------------------------------------------------
   MAIN POST ROUTE
--------------------------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const email = (body.email ?? "").toString().trim();
    const origin = req.headers.get("origin") || new URL(req.url).origin;

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    /* ============================================================
       1) BUY CREDITS (One-time checkout)
    ============================================================ */
    if (body.buyCredits) {
      if (!stripe) {
        return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
      }

      const credits = Number(body.credits || 0);
      const amountAED = Number(body.amountAED || 0);

      if (!credits || credits < 500) {
        return NextResponse.json({ error: "Minimum 500 credits required" }, { status: 400 });
      }

      if (!amountAED || amountAED <= 0) {
        return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: email,
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "aed",
              product_data: { name: `${credits} Credits` },
              unit_amount: Math.round(amountAED * 100), // AED -> fils
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/dashboard?payment=success`,
        cancel_url: `${origin}/dashboard?payment=cancelled`,
        metadata: {
          credits: credits.toString(),
          email,
          type: "credit_purchase",
        },
      });

      return NextResponse.json({ url: session.url }, { status: 200 });
    }

    /* ============================================================
       2) NORMAL SUBSCRIPTION LOGIC (Same behavior, safer typings)
    ============================================================ */

    const plan: Plan = normalizePlan(body.plan as PlanIn | undefined);
    const cycle = (body.cycle ?? "monthly").toString().toLowerCase() as Cycle;

    const profilePayload = body.profile as unknown | undefined;

    if (cycle !== "monthly" && cycle !== "yearly") {
      return NextResponse.json({ error: "Invalid billing cycle" }, { status: 400 });
    }

    // ✅ IMPORTANT CHANGE:
    // Remove Prisma.*Input types (they break depending on schema/model naming & client gen)
    // Keep exact functionality: upsert registration + optional profile JSON
    const createPayload = {
      email,
      active: true,
      ...(profilePayload !== undefined ? { profile: profilePayload } : {}),
    };

    const updatePayload =
      profilePayload !== undefined ? { profile: profilePayload } : {};

    await prisma.registration.upsert({
      where: { email },
      create: createPayload as any,
      update: updatePayload as any,
    });

    if (plan === "free") {
      await setActivePlan({ email, plan: "FREE", renewInterval: cycle });
      return NextResponse.json(
        { url: `${origin}/api/checkout/success?free=1` },
        { status: 200 }
      );
    }

    const hostedLink = LINK_MAP[`${plan}:${cycle}`];
    if (hostedLink && hostedLink.startsWith("http")) {
      return NextResponse.json({ url: hostedLink }, { status: 200 });
    }

    const priceId = PRICE_MAP[`${plan}:${cycle}`];
    if (stripe && priceId) {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: email,
        payment_method_types: ["card"],
        success_url: `${origin}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/pricing?canceled=1`,
        metadata: { userEmail: email, plan, cycle },
        subscription_data: { metadata: { userEmail: email, plan, cycle } },
      });

      return NextResponse.json({ url: session.url }, { status: 200 });
    }

    return NextResponse.json(
      {
        error:
          "No checkout link or Stripe price configured. Set NEXT_PUBLIC_CHECKOUT_* or STRIPE_PRICE_* environment variables.",
      },
      { status: 500 }
    );
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 });
  }
}

/* GET */
export async function GET() {
  return NextResponse.json({ ok: true, method: "GET" });
}
