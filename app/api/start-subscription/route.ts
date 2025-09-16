// app/api/start-subscription/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // runtime only on Vercel

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email: string };
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const { STRIPE_SECRET_KEY } = process.env;
    if (!STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe not configured. Set STRIPE_SECRET_KEY in Vercel env." },
        { status: 500 }
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // Find or create customer by email
    const list = await stripe.customers.list({ email, limit: 1 });
    const customer = (list.data && list.data[0])
      ? list.data[0]
      : await stripe.customers.create({ email });

    // Create a SetupIntent so you can collect and save a card now
    const si = await stripe.setupIntents.create({
      customer: customer.id,
      usage: "off_session",
    });

    return NextResponse.json({
      setupClientSecret: si.client_secret,
      customerId: customer.id,
    });
  } catch (err: any) {
    console.error("start-subscription ERROR:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
