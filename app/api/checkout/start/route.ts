// app/api/checkout/start/route.ts
import { NextResponse, NextRequest } from "next/server";
import Stripe from "stripe";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Use a real, supported API version (your previous "2025-09-30.clover" is invalid)
  apiVersion: "2025-10-29.clover",
});

function planKey(plan: string, cycle: string) {
  return `${String(plan).toLowerCase()}:${String(cycle).toLowerCase()}`;
}

// Map plan/cycle to env Price IDs. Keep your plans the same.
const PRICE_ID_MAP: Record<string, string | undefined> = {
  "basic:monthly": process.env.STRIPE_PRICE_BASIC_MONTHLY,
  "basic:yearly": process.env.STRIPE_PRICE_BASIC_YEARLY,
  "premium:monthly": process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  "premium:yearly": process.env.STRIPE_PRICE_PREMIUM_YEARLY,
};

function ensurePriceId(plan: string, cycle: string) {
  const key = planKey(plan, cycle);
  const price = PRICE_ID_MAP[key];
  if (!price) {
    throw new Error(
      `Missing Stripe Price ID for "${key}". Set env (e.g. STRIPE_PRICE_BASIC_MONTHLY / YEARLY, STRIPE_PRICE_PREMIUM_MONTHLY / YEARLY).`
    );
  }
  return price;
}

function getOrigin(req: NextRequest) {
  const hdr = new Headers(req.headers);
  const proto = hdr.get("x-forwarded-proto") || "http";
  const host = hdr.get("x-forwarded-host") || hdr.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, plan, cycle } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    if (!["basic", "premium"].includes(String(plan))) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (!["monthly", "yearly"].includes(String(cycle))) {
      return NextResponse.json({ error: "Invalid billing cycle" }, { status: 400 });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    // Normalize email to avoid case issues
    const normalizedEmail = String(email).trim().toLowerCase();

    // Create or reuse user (case-insensitive lookup)
    let user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    });

    const passHash = await bcrypt.hash(password, 10);

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: passHash,
          name: name || null,
          plan: plan,
          billingCycle: cycle,
          status: "pending_payment", // becomes active on webhook after payment
        },
      });
    } else {
      // only set password if user didn’t have one; keep your behavior
      if (!user.passwordHash) {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: passHash },
        });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { plan, billingCycle: cycle, status: "pending_payment" },
      });
      // refresh user for downstream fields
      user = await prisma.user.findUnique({ where: { id: user.id } });
    }

    // Ensure Stripe Customer exists & is stored on user
    let customerId = user!.stripeCustomerId || undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: normalizedEmail,
        name: name ?? undefined,
        metadata: { appUserId: user!.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user!.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Resolve price id or throw a clear error if missing
    const price = ensurePriceId(plan, cycle);

    // Success/cancel URLs — prefer APP_BASE_URL if provided; otherwise use request origin
    const base =
      (process.env.APP_BASE_URL && process.env.APP_BASE_URL.replace(/\/$/, "")) ||
      getOrigin(req);

    const successPath = process.env.CHECKOUT_SUCCESS_PATH || "/checkout/success";
    const cancelPath = process.env.CHECKOUT_CANCEL_PATH || "/pricing";

    const success_url = `${base}${successPath}?session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${base}${cancelPath}`;

    // Create a Checkout Session for a subscription
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }], // ✅ Always provide price
      allow_promotion_codes: true,
      success_url,
      cancel_url,
      metadata: {
        appUserId: user!.id,
        plan,
        cycle,
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error("checkout/start error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to start checkout" },
      { status: 500 }
    );
  }
}
