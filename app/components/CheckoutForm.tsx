"use client";

import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useState } from "react";

export default function CheckoutForm({
  email,
  planId,
  cycle,
  setupClientSecret,
}: {
  email: string;
  planId: "basic" | "professional";
  cycle: "monthly" | "yearly";
  setupClientSecret: string;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setMessage(null);

    // 1) Confirm the SetupIntent (collect and save card)
    const setupRes = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?plan=${planId}&cycle=${cycle}`,
      },
      redirect: "if_required",
    });

    if (setupRes.error) {
      setMessage(setupRes.error.message || "Card setup failed. Please try again.");
      setSubmitting(false);
      return;
    }

    // Get the payment_method id from the SetupIntent
    const setupIntent = setupRes.setupIntent;
    const paymentMethodId = (setupIntent?.payment_method as string) || "";

    if (!paymentMethodId) {
      setMessage("No payment method was created. Please try again.");
      setSubmitting(false);
      return;
    }

    // 2) Create the subscription with that saved card
    const actRes = await fetch("/api/activate-subscription", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, planId, cycle, paymentMethodId }),
    });
    const actData = await actRes.json();
    if (!actRes.ok) {
      setMessage(actData.error || "Failed to activate subscription.");
      setSubmitting(false);
      return;
    }

    // 3) If 3DS is required now, confirm the PaymentIntent
    if (actData.requiresActionClientSecret) {
      const confirmRes = await stripe.confirmCardPayment(actData.requiresActionClientSecret);
      if (confirmRes.error) {
        setMessage(confirmRes.error.message || "Authentication failed. Please try again.");
        setSubmitting(false);
        return;
      }
    }

    // Success — go to your success page
    window.location.href = "/checkout/success";
  };

  return (
    <form onSubmit={onSubmit} className="mt-8 rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="grid gap-6">
        <PaymentElement />
        <button
          disabled={submitting || !stripe || !elements}
          className="w-full rounded-xl bg-[#2BAEFF] px-6 py-3 font-semibold text-white hover:opacity-95 disabled:opacity-50"
        >
          {submitting ? "Processing…" : "Save card & subscribe"}
        </button>
        {message && <p className="text-sm text-red-600">{message}</p>}
      </div>
    </form>
  );
}
