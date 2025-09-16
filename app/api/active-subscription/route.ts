// app/api/activate-subscription/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, planId, cycle, paymentMethodId } = (await req.json()) as {
      email: string;
      planId: "basic" | "professional";
      cycle: "monthly" | "yearly";
      paymentMethodId: string; // from the confirmed SetupIntent
    };

    if (!email || !planId || !cycle || !paymentMethodId) {
      return NextResponse.json(
        { error: "Missing email/planId/cycle/paymentMethodId" },
        { status: 400 }
      );
    }

    const {
      STRIPE_SECRET_KEY,
      STRIPE_PRICE_BASIC_MONTHLY,
      STRIPE_PRICE_BASIC_YEARLY,
      STRIPE_PRICE_PROFESSIONAL_MONTHLY,
      STRIPE_PRICE_PROFESSIONAL_YEARLY,
    } = process.env;

    if (!STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe not configured. Set STRIPE_SECRET_KEY in Vercel env." },
        { status: 500 }
      );
    }

    const priceMap: Record<"basic" | "professional", Record<"monthly" | "yearly", string | undefined>> = {
      basic: {
        monthly: STRIPE_PRICE_BASIC_MONTHLY,
        yearly: STRIPE_PRICE_BASIC_YEARLY,
      },
      professional: {
        monthly: STRIPE_PRICE_PROFESSIONAL_MONTHLY,
        yearly: STRIPE_PRICE_PROFESSIONAL_YEARLY,
      },
    };
    const price = priceMap[planId]?.[cycle];
    if (!price || !/^price_/.test(price)) {
      return NextResponse.json(
        { error: `Price ID missing/invalid for ${planId}/${cycle}. Set valid price_... in Vercel env.` },
        { status: 500 }
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // Find or create customer
    const list = await stripe.customers.list({ email, limit: 1 });
    const customer = (list.data && list.data[0])
      ? list.data[0]
      : await stripe.customers.create({ email });

    // Ensure the payment method is attached to the customer
    try {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
    } catch (e: any) {
      // If it's already attached, ignore that error
      if (e?.code !== "resource_already_exists") throw e;
    }

    // Make it the default for invoices
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Create the subscription; expand PI so we can handle 3DS if needed
    const sub = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price }],
      collection_method: "charge_automatically",
      trial_from_plan: false,
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    const latestInvoice: any = sub.latest_invoice;
    const pi: any = latestInvoice?.payment_intent || null;

    // If 3DS is required, return PI client secret so the client can authenticate
    if (pi?.status === "requires_action" || pi?.status === "requires_confirmation") {
      return NextResponse.json({
        requiresActionClientSecret: pi.client_secret,
        subscriptionId: sub.id,
      });
    }

    // If already paid/active, we’re done
    if (pi?.status === "succeeded" || sub.status === "active" || latestInvoice?.status === "paid") {
      return NextResponse.json({ success: true, subscriptionId: sub.id });
    }

    // Zero-due first invoice or trial (still okay; card saved, charges will happen later)
    const amountDue = (latestInvoice?.amount_due ?? latestInvoice?.total ?? 0) || 0;
    if (amountDue === 0 || sub.status === "trialing") {
      return NextResponse.json({ success: true, subscriptionId: sub.id });
    }

    // Otherwise, surface context
    return NextResponse.json(
      {
        error: "Subscription incomplete and no PaymentIntent to confirm.",
        details: {
          subscriptionStatus: sub.status,
          invoiceId: latestInvoice?.id,
          invoiceStatus: latestInvoice?.status,
          piStatus: pi?.status ?? null,
          amountDue,
        },
      },
      { status: 500 }
    );
  } catch (err: any) {
    console.error("activate-subscription ERROR:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
