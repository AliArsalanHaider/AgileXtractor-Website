// app/api/checkout/success/page.tsx
"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

export default function SuccessPage() {
  const [ok, setOk] = useState(false);
  const [mode, setMode] = useState<"subscription" | "payment" | "setup" | "free" | null>(null);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get("session_id");
      const free = params.get("free");

      if (free) {
        setMode("free");
        setOk(true);
        return;
      }

      if (sessionId) {
        setMode("subscription");
        setOk(true);
        return;
      }

      const stripePub = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!;
      const stripe = stripePub ? await loadStripe(stripePub) : null;

      const piCS = params.get("payment_intent_client_secret");
      const siCS = params.get("setup_intent_client_secret");

      if (stripe && piCS) {
        const { paymentIntent } = await stripe.retrievePaymentIntent(piCS);
        setMode("payment");
        setOk(paymentIntent?.status === "succeeded");
        return;
      }

      if (stripe && siCS) {
        const { setupIntent } = await stripe.retrieveSetupIntent(siCS);
        setMode("setup");
        setOk(setupIntent?.status === "succeeded");
        return;
      }

      setOk(true);
    })();
  }, []);

  return (
    <div className="min-h-[60vh] grid place-items-center bg-white">
      <div className="rounded-2xl bg-white p-8 shadow border border-gray-200 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === "free" ? "Free plan activated 🎉" : ok ? "Payment successful 🎉" : "Thanks! We’re finalizing…"}
        </h1>
        <p className="mt-2 text-gray-600">
          {mode === "free"
            ? "Your Free plan is active and credits have been added."
            : "Your subscription was created. Credits appear shortly after confirmation."}
        </p>
        <a className="mt-6 inline-block rounded-xl bg-[#2BAEFF] px-6 py-3 font-semibold text-white" href="/dashboard">
          Go to dashboard
        </a>
      </div>
    </div>
  );
}
