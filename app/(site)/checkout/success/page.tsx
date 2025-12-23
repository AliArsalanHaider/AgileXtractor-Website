// app/checkout/success/page.tsx
"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

type Mode = "subscription" | "payment" | "setup" | "free" | "unknown";

export default function SuccessPage() {
  const [mode, setMode] = useState<Mode>("unknown");
  const [ok, setOk] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get("session_id");
      const free = params.get("free");

      if (free) {
        if (!mounted) return;
        setMode("free");
        setOk(true);
        return;
      }

      if (sessionId) {
        if (!mounted) return;
        setMode("subscription");
        setOk(true);
        return;
      }

      const pubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || "";
      const stripe = pubKey ? await loadStripe(pubKey) : null;

      const piCS = params.get("payment_intent_client_secret");
      const siCS = params.get("setup_intent_client_secret");

      if (stripe && piCS) {
        const { paymentIntent } = await stripe.retrievePaymentIntent(piCS);
        if (!mounted) return;
        setMode("payment");
        setOk(paymentIntent?.status === "succeeded");
        return;
      }

      if (stripe && siCS) {
        const { setupIntent } = await stripe.retrieveSetupIntent(siCS);
        if (!mounted) return;
        setMode("setup");
        setOk(setupIntent?.status === "succeeded");
        return;
      }

      if (!mounted) return;
      setMode("unknown");
      setOk(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const headline =
    mode === "free"
      ? "Free plan activated 🎉"
      : ok
      ? "Payment successful 🎉"
      : "Thanks! We’re finalizing…";

  const subtext =
    mode === "free"
      ? "Your Free plan is active and credits have been added."
      : ok
      ? "Your subscription was created. Credits appear shortly after confirmation."
      : "You can close this page — we’ll update your account shortly.";

  return (
    <main className="min-h-[60vh] grid place-items-center bg-white px-4">
      <section className="w-full max-w-lg rounded-2xl bg-white p-8 shadow border border-gray-200 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{headline}</h1>
        <p className="mt-2 text-gray-600">{subtext}</p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <a
            href="/dashboard"
            className="inline-block rounded-xl bg-[#2BAEFF] px-6 py-3 font-semibold text-white hover:opacity-90"
          >
            Go to dashboard
          </a>
          <a
            href="/"
            className="inline-block rounded-xl border border-[#2BAEFF] px-6 py-3 font-semibold text-[#2BAEFF] hover:bg-[#2BAEFF]/10"
          >
            Back to home
          </a>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Mode: {mode} • Status: {ok ? "ok" : "pending"}
        </p>
      </section>
    </main>
  );
}
