"use client";

import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useEffect, useState } from "react";

export default function CheckoutForm({
  email,
  planId,
  cycle,
  clientSecret,
}: {
  email: string;
  planId: string;
  cycle: string;
  clientSecret: string;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      if (!stripe || !clientSecret) return;
      const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
      if (paymentIntent?.status === "succeeded") setShowSuccess(true);
    })();
  }, [stripe, clientSecret]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?plan=${planId}&cycle=${cycle}`,
        receipt_email: email, // Stripe will email the receipt (enable in Dashboard)
      },
    });

    if (error) {
      setMessage(error.message || "Payment failed. Please try again.");
    } else {
      const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
      if (paymentIntent?.status === "succeeded") setShowSuccess(true);
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="mt-8 rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="grid gap-6">
        <PaymentElement />
        <button
          disabled={submitting || !stripe || !elements}
          className="w-full rounded-xl bg-[#2BAEFF] px-6 py-3 font-semibold text-white hover:opacity-95 disabled:opacity-50"
        >
          {submitting ? "Processing…" : "Pay now"}
        </button>
        {message && <p className="text-sm text-red-600">{message}</p>}
      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
            <h3 className="text-2xl font-bold text-gray-900">Payment successful 🎉</h3>
            <p className="mt-2 text-gray-600">
              A receipt has been sent to <span className="font-medium">{email}</span>.
            </p>
            <a href="/" className="mt-6 inline-block rounded-xl bg-[#2BAEFF] px-6 py-3 font-semibold text-white">
              Continue
            </a>
          </div>
        </div>
      )}
    </form>
  );
}
