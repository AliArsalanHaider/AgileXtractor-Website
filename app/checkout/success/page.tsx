"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

export default function SuccessPage() {
  const [ok, setOk] = useState(false);
  const [mode, setMode] = useState<"payment" | "setup" | null>(null);

  useEffect(() => {
    (async () => {
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);
      const params = new URLSearchParams(window.location.search);
      const piCS = params.get("payment_intent_client_secret");
      const siCS = params.get("setup_intent_client_secret");
      if (!stripe) return setOk(true);

      if (piCS) {
        setMode("payment");
        const { paymentIntent } = await stripe.retrievePaymentIntent(piCS);
        setOk(paymentIntent?.status === "succeeded");
      } else if (siCS) {
        setMode("setup");
        const { setupIntent } = await stripe.retrieveSetupIntent(siCS);
        setOk(setupIntent?.status === "succeeded");
      } else {
        // If nothing is present, assume success (e.g., non-redirected happy path)
        setOk(true);
      }
    })();
  }, []);

  return (
    <div className="min-h-[60vh] grid place-items-center bg-white">
      <div className="rounded-2xl bg-white p-8 shadow border border-gray-200 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {ok ? (mode === "setup" ? "Card saved 🎉" : "Payment successful 🎉") : "Thanks! We’re finalizing…"}
        </h1>
        <p className="mt-2 text-gray-600">
          {ok
            ? (mode === "setup" ? "Your card is on file for future charges." : "We emailed you a receipt. You can close this tab.")
            : "If required, you may be redirected for verification."}
        </p>
        <a href="/" className="mt-6 inline-block rounded-xl bg-[#2BAEFF] px-6 py-3 font-semibold text-white">
          Back to home
        </a>
      </div>
    </div>
  );
}
