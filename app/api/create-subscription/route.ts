import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // ensure pure runtime on Vercel

// ---- helpers for newer Stripe SDK (Stripe.Response<T>) ----
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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  try {
    const { planId, cycle, email } = (await req.json()) as {
      planId: "basic" | "professional";
      cycle: "monthly" | "yearly";
      email: string;
    };
    if (!planId || !cycle || !email) {
      return NextResponse.json({ error: "Missing required fields: planId, cycle, email" }, { status: 400 });
    }

    // ---- read envs at runtime (NOT at module scope) ----
    const {
      STRIPE_SECRET_KEY,
      STRIPE_PRICE_BASIC_MONTHLY,
      STRIPE_PRICE_BASIC_YEARLY,
      STRIPE_PRICE_PROFESSIONAL_MONTHLY,
      STRIPE_PRICE_PROFESSIONAL_YEARLY,
    } = process.env;
    if (!STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe is not configured (STRIPE_SECRET_KEY missing)." }, { status: 500 });
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
        { error: `Price ID missing/invalid for ${planId}/${cycle}. Set a valid price_... ID in Vercel env.` },
        { status: 500 }
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // 1) find or create customer
    const listResp = await stripe.customers.list({ email, limit: 1 });
    const existing = firstFromList(listResp);
    const customer = existing ?? unwrap(await stripe.customers.create({ email }));

    // 2) create subscription (no trial; auto-charge when due)
    const subResp = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price }],
      collection_method: "charge_automatically",
      trial_from_plan: false,
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      // we’ll fetch invoice with PI below; also grab pending_setup_intent for $0 case
      expand: ["latest_invoice", "pending_setup_intent"],
    });
    const subscription = unwrap(subResp);

    // 3) get invoice id
    const invoiceId =
      typeof subscription.latest_invoice === "string"
        ? subscription.latest_invoice
        : subscription.latest_invoice?.id ?? null;
    if (!invoiceId) {
      return NextResponse.json({ error: "No latest invoice found on subscription." }, { status: 500 });
    }

    // 4) retrieve invoice with PI & charge expanded
    let invoice = unwrap(
      await stripe.invoices.retrieve(invoiceId, {
        expand: ["payment_intent", "charge", "charge.payment_intent"],
      })
    );

    // finalize if draft to attach PI
    if (invoice.status === "draft") {
      invoice = unwrap(
        await stripe.invoices.finalizeInvoice(invoiceId, {
          expand: ["payment_intent", "charge", "charge.payment_intent"],
        })
      );
    }

    // 5) money due now?
    const amountDue = (invoice.amount_due ?? invoice.total ?? 0) || 0;
    const isPaid = invoice.status === "paid";

    // helper: pull PI client_secret (directly or via charge)
    const getPIClientSecretOnce = async (): Promise<string | null> => {
      const piRef = (invoice as any)["payment_intent"] as string | Stripe.PaymentIntent | null | undefined;
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

    // short poll: Stripe sometimes attaches PI moments after finalization
    const getPIClientSecret = async (): Promise<string | null> => {
      for (let i = 0; i < 4; i++) {
        const cs = await getPIClientSecretOnce();
        if (cs) return cs;
        await sleep(250); // small delay
        invoice = unwrap(
          await stripe.invoices.retrieve(invoiceId, {
            expand: ["payment_intent", "charge", "charge.payment_intent"],
          })
        );
      }
      return null;
    };

    if (amountDue > 0) {
      const clientSecret = await getPIClientSecret();

      if (clientSecret) {
        return NextResponse.json({
          mode: "payment",
          clientSecret,
          subscriptionId: subscription.id,
        });
      }

      // If customer had a saved default PM, Stripe may have already paid the invoice off-session
      if (isPaid) {
        return NextResponse.json({ alreadyPaid: true, subscriptionId: subscription.id });
      }

      return NextResponse.json(
        {
          error: "Could not retrieve payment intent.",
          details: { subscriptionId: subscription.id, invoiceId, invoiceStatus: invoice.status, amountDue },
        },
        { status: 500 }
      );
    }

    // 6) amountDue === 0 → still collect a card now via SetupIntent (for future charges)
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
