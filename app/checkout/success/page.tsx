"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

export default function SuccessPage() {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);
      const cs = new URLSearchParams(window.location.search).get("payment_intent_client_secret");
      if (!stripe || !cs) return setOk(true);
      const { paymentIntent } = await stripe.retrievePaymentIntent(cs);
      setOk(paymentIntent?.status === "succeeded");
    })();
  }, []);

  return (
    <div className="min-h-[60vh] grid place-items-center bg-white">
      <div className="rounded-2xl bg-white p-8 shadow border border-gray-200 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {ok ? "Payment successful 🎉" : "Thanks! We’re finalizing your payment…"}
        </h1>
        <p className="mt-2 text-gray-600">
          {ok ? "We emailed you a receipt. You can close this tab." : "If required, you may be redirected for verification."}
        </p>
        <a href="/" className="mt-6 inline-block rounded-xl bg-[#2BAEFF] px-6 py-3 font-semibold text-white">
          Back to home
        </a>
      </div>
    </div>
  );
}
