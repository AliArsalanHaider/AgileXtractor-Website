import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs"; // Stripe SDK requires Node, not Edge

// --- env helpers ---
function reqEnv(name: string) {
  const v = process.env[name];
  if (!v || v.trim() === "") throw new Error(`${name} is not set`);
  return v;
}
function reqPrice(name: string) {
  const v = reqEnv(name);
  if (!/^price_/.test(v)) throw new Error(`${name} must start with "price_"`);
  return v;
}

// Do NOT pin apiVersion to avoid TS literal mismatches on Vercel
const stripe = new Stripe(reqEnv("STRIPE_SECRET_KEY"));

// unwrap helpers (newer SDK often returns Stripe.Response<T>)
function unwrap<T>(resp: T | Stripe.Response<T>): T {
  return (resp as any)?.data ?? (resp as T);
}
function firstFromList<T>(
  resp: Stripe.Response<Stripe.ApiList<T>> | Stripe.ApiList<T>
): T | undefined {
  const body = (resp as any)?.data ?? resp;
  const arr: T[] = (body as any)?.data ?? body;
  return Array.isArray(arr) ? arr[0] : undefined;
}

// prices
const priceMap = {
  basic: {
    monthly: reqPrice("STRIPE_PRICE_BASIC_MONTHLY"),
    yearly: reqPrice("STRIPE_PRICE_BASIC_YEARLY"),
  },
  professional: {
    monthly: reqPrice("STRIPE_PRICE_PROFESSIONAL_MONTHLY"),
    yearly: reqPrice("STRIPE_PRICE_PROFESSIONAL_YEARLY"),
  },
} as const;

type Plan = keyof typeof priceMap;
type Cycle = keyof (typeof priceMap)["basic"];

export async function POST(req: NextRequest) {
  try {
    const { planId, cycle, email } = (await req.json()) as {
      planId: Plan;
      cycle: Cycle;
      email: string;
    };

    if (!planId || !cycle || !email) {
      return NextResponse.json({ error: "Missing required fields: planId, cycle, email" }, { status: 400 });
    }

    const price = priceMap[planId]?.[cycle];
    if (!price) {
      return NextResponse.json({ error: `Price not configured for ${planId}/${cycle}` }, { status: 400 });
    }

    // 1) find or create customer
    const listResp = await stripe.customers.list({ email, limit: 1 });
    const existing = firstFromList(listResp);
    const customer = existing ?? unwrap(await stripe.customers.create({ email }));

    // 2) create subscription, payable first invoice (no trial)
    const subResp = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price }],
      collection_method: "charge_automatically",
      trial_from_plan: false,
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      // expand minimal; we'll retrieve invoice with deeper expands below
      expand: ["latest_invoice"],
    });
    const subscription = unwrap(subResp);

    // 3) get invoice id
    const invoiceId =
      typeof subscription.latest_invoice === "string"
        ? subscription.latest_invoice
        : subscription.latest_invoice?.id ?? null;

    if (!invoiceId) {
      return NextResponse.json({ error: "No latest invoice found on subscription" }, { status: 500 });
    }

    // 4) retrieve invoice with both PI and charge expanded (charge is a reliable fallback)
    let invoice = unwrap(
      await stripe.invoices.retrieve(invoiceId, { expand: ["payment_intent", "charge", "charge.payment_intent"] })
    );

    // If draft, finalize to attach PI when payment is due
    if (invoice.status === "draft") {
      invoice = unwrap(
        await stripe.invoices.finalizeInvoice(invoiceId, { expand: ["payment_intent", "charge", "charge.payment_intent"] })
      );
    }

    // 5) compute due and status
    const amountDue = (invoice.amount_due ?? invoice.total ?? 0) || 0;
    const isPaid = invoice.status === "paid";

    // Helper to extract PI client_secret from invoice or charge
    async function getPIClientSecretFromInvoice(inv: Stripe.Invoice): Promise<string | null> {
      // a) direct on invoice
      const piRef = (inv as any)["payment_intent"] as string | Stripe.PaymentIntent | null | undefined;
      if (piRef && typeof piRef !== "string" && piRef.client_secret) return piRef.client_secret;
      if (typeof piRef === "string") {
        const pi = unwrap(await stripe.paymentIntents.retrieve(piRef));
        return pi.client_secret ?? null;
      }
      // b) via charge fallback (paid invoices often have charge with PI)
      const chargeRef = (inv as any)["charge"] as string | Stripe.Charge | null | undefined;
      if (chargeRef) {
        const charge =
          typeof chargeRef === "string"
            ? unwrap(await stripe.charges.retrieve(chargeRef, { expand: ["payment_intent"] }))
            : chargeRef;
        const cpi = (charge as any)["payment_intent"] as string | Stripe.PaymentIntent | null | undefined;
        if (cpi && typeof cpi !== "string" && cpi.client_secret) return cpi.client_secret;
        if (typeof cpi === "string") {
          const pi = unwrap(await stripe.paymentIntents.retrieve(cpi));
          return pi.client_secret ?? null;
        }
      }
      return null;
    }

    // If there’s money due now, return a PaymentIntent client secret (or show “already paid” if auto-charged)
    if (amountDue > 0) {
      const clientSecret = await getPIClientSecretFromInvoice(invoice);
      if (clientSecret) {
        return NextResponse.json({
          mode: "payment",
          clientSecret,
          subscriptionId: subscription.id,
        });
      }
      // If Stripe auto-charged because a default card existed, status will likely be "paid" and no PI to confirm
      if (isPaid) {
        return NextResponse.json({
          alreadyPaid: true,
          subscriptionId: subscription.id,
        });
      }
      // else genuine error
      return NextResponse.json(
        {
          error: "Could not retrieve payment intent.",
          details: {
            subscriptionId: subscription.id,
            invoiceId,
            invoiceStatus: invoice.status,
            amountDue,
          },
        },
        { status: 500 }
      );
    }

    // If nothing is due now ($0 first invoice: trial/coupon/metered), collect card via SetupIntent
    const psiRef = subscription.pending_setup_intent as string | Stripe.SetupIntent | null | undefined;
    if (psiRef && typeof psiRef !== "string") {
      return NextResponse.json({
        mode: "setup",
        setupClientSecret: psiRef.client_secret,
        subscriptionId: subscription.id,
      });
    }
    if (typeof psiRef === "string") {
      const si = unwrap(await stripe.setupIntents.retrieve(psiRef));
      return NextResponse.json({
        mode: "setup",
        setupClientSecret: si.client_secret,
        subscriptionId: subscription.id,
      });
    }
    const fallbackSI = unwrap(
      await stripe.setupIntents.create({ customer: customer.id, usage: "off_session" })
    );
    return NextResponse.json({
      mode: "setup",
      setupClientSecret: fallbackSI.client_secret,
      subscriptionId: subscription.id,
    });
  } catch (err: any) {
    console.error("create-subscription ERROR:", err);
    const status = typeof err?.statusCode === "number" ? err.statusCode : 500;
    const message = err?.raw?.message || err?.message || "Server error";
    const code = err?.raw?.code || err?.code;
    return NextResponse.json({ error: message, code }, { status });
  }
}
