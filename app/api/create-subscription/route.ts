import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

type Cycle = "monthly" | "yearly";
type Plan = "basic" | "professional";

const priceMap: Record<Plan, Record<Cycle, string | undefined>> = {
  basic: {
    monthly: process.env.STRIPE_PRICE_BASIC_MONTHLY,
    yearly: process.env.STRIPE_PRICE_BASIC_YEARLY,
  },
  professional: {
    monthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
    yearly: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY,
  },
};

export async function POST(req: NextRequest) {
  try {
    const { planId, cycle, email } = (await req.json()) as {
      planId: Plan;
      cycle: Cycle;
      email: string;
    };

    const price = priceMap[planId]?.[cycle];
    if (!price) {
      return NextResponse.json({ error: "Invalid plan/cycle" }, { status: 400 });
    }

    // Find or create a customer by email
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer =
      existing.data[0] ?? (await stripe.customers.create({ email }));

    // Create a subscription that requires client-side confirmation
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    });

    const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
    const pi = latestInvoice.payment_intent as Stripe.PaymentIntent;

    return NextResponse.json({
      clientSecret: pi.client_secret,
      subscriptionId: subscription.id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 },
    );
  }
}
