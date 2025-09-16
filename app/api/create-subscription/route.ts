// app/api/create-subscription/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // keep this route purely dynamic

// --- Helpers to normalize Stripe's Response<T> wrappers ---
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

export async function POST(req: NextRequest) {
  try {
    // Parse body
    const { planId, cycle, email } = (await req.json()) as {
      planId: "basic" | "professional";
      cycle: "monthly" | "yearly";
      email: string;
    };
    if (!planId || !cycle || !email) {
      return NextResponse.json(
        { error: "Missing required fields: planId, cycle, email" },
        { status: 400 }
      );
    }

    // ----- Read envs at runtime (NOT at module scope) -----
    const {
      STRIPE_SECRET_KEY,
      STRIPE_PRICE_BASIC_MONTHLY,
      STRIPE_PRICE_BASIC_YEARLY,
      STRIPE_PRICE_PROFESSIONAL_MONTHLY,
      STRIPE_PRICE_PROFESSIONAL_YEARLY,
    } = process.env;

    if (!STRIPE_SECRET_KEY) {
      // Don’t crash build; return a runtime error instead
      return NextResponse.json(
        { error: "Stripe is not configured. Set STRIPE_SECRET_KEY in Vercel env." },
        { status: 500 }
      );
    }

    // Validate price map lazily
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
        { error: `Price ID missing for ${planId}/${cycle}. Add a valid price_... ID to Vercel env.` },
        { status: 500 }
      );
    }

    // Create Stripe client now that we know the key exists
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // 1) Find or create customer by email
    const listResp = await stripe.customers.list({ email, limit: 1 });
    const existing = firstFromList(listResp);
    const customer = existing ?? unwrap(await stripe.customers.create({ email }));

    // 2) Create subscription → payable first invoice (skip trials)
    const subResp = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price }],
      collection_method: "charge_automatically",
      trial_from_plan: false,
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice", "pending_setup_intent"],
    });
    const subscription = unwrap(subResp);

    // 3) Get invoice id
    const invoiceId =
      typeof subscription.latest_invoice === "string"
        ? subscription.latest_invoice
        : subscription.latest_invoice?.id ?? null;

    if (!invoiceId) {
      return NextResponse.json(
        { error: "No latest invoice found on subscription" },
        { status: 500 }
      );
    }

    // 4) Retrieve invoice with PI & charge expanded (charge is a reliable fallback)
    let invoice = unwrap(
      await stripe.invoices.retrieve(invoiceId, {
        expand: ["payment_intent", "charge", "charge.payment_intent"],
      })
    );

    // If invoice is draft, finalize it to attach a PI when payment is due
    if (invoice.status === "draft") {
      invoice = unwrap(
        await stripe.invoices.finalizeInvoice(invoiceId, {
          expand: ["payment_intent", "charge", "charge.payment_intent"],
        })
      );
    }

    // 5) Decide the flow
    const amountDue = (invoice.amount_due ?? invoice.total ?? 0) || 0;
    const isPaid = invoice.status === "paid";

    // Helper: extract PI client_secret either directly or via charge
    const getPIClientSecret = async (): Promise<string | null> => {
      const piRef = (invoice as any)["payment_intent"] as
        | string
        | Stripe.PaymentIntent
        | null
        | undefined;
      if (piRef && typeof piRef !== "string" && piRef.client_secret) return piRef.client_secret;
      if (typeof piRef === "string") {
        const pi = unwrap(await stripe.paymentIntents.retrieve(piRef));
        return pi.client_secret ?? null;
      }
      const chargeRef = (invoice as any)["charge"] as string | Stripe.Charge | null | undefined;
      if (chargeRef) {
        const charge =
          typeof chargeRef === "string"
            ? unwrap(await stripe.charges.retrieve(chargeRef, { expand: ["payment_intent"] }))
            : chargeRef;
        const cpi = (charge as any)["payment_intent"] as string | Stripe.PaymentIntent | null | undefined;
        if (cpi && typeof cpi !== "string" && cpi.client_secret) return cpi.client_secret;
        if (typeof cpi === "string") {
          const pi2 = unwrap(await stripe.paymentIntents.retrieve(cpi));
          return pi2.client_secret ?? null;
        }
      }
      return null;
    };

    if (amountDue > 0) {
      // Money due now → return PaymentIntent client secret
      const clientSecret = await getPIClientSecret();
      if (clientSecret) {
        return NextResponse.json({
          mode: "payment",
          clientSecret,
          subscriptionId: subscription.id,
        });
      }
      // If Stripe auto-charged off-session (saved card), invoice is already paid
      if (isPaid) {
        return NextResponse.json({
          alreadyPaid: true,
          subscriptionId: subscription.id,
        });
      }
      return NextResponse.json(
        {
          error: "Could not retrieve payment intent.",
          details: { subscriptionId: subscription.id, invoiceId, invoiceStatus: invoice.status, amountDue },
        },
        { status: 500 }
      );
    }

    // amountDue === 0 → collect card now via SetupIntent (store for later charges)
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
    // fallback SI
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
