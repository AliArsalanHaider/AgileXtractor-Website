"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import CheckoutForm from "@/app/components/CheckoutForm";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

export default function CheckoutPage() {
  const params = useSearchParams();
  const plan = (params.get("plan") ?? "basic") as "basic" | "professional";
  const cycle = (params.get("cycle") ?? "monthly") as "monthly" | "yearly";

  const [email, setEmail] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options: StripeElementsOptions | undefined = useMemo(() => {
    if (!clientSecret) return undefined;
    return {
      clientSecret,
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "#2BAEFF",
          colorBackground: "#ffffff",
          colorText: "#0f172a",
          borderRadius: "12px",
          spacingUnit: "6px",
        },
        rules: {
          ".Input": { borderColor: "#e5e7eb" },
          ".Input:focus": {
            borderColor: "#2BAEFF",
            boxShadow: "0 0 0 3px rgba(43,174,255,.25)",
          },
        },
      } as any,
    };
  }, [clientSecret]);

  async function startCheckout(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/create-subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId: plan, cycle, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start checkout");
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Complete your purchase</h1>
        <p className="mt-2 text-gray-600">
          Plan: <span className="font-medium capitalize">{plan}</span> • Billing:{" "}
          <span className="font-medium capitalize">{cycle}</span>
        </p>

        {!clientSecret ? (
          <form onSubmit={startCheckout} className="mt-8 grid gap-4 rounded-2xl border border-gray-200 p-6">
            <label className="text-sm font-medium text-gray-700">
              Email for receipt & account
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#2BAEFF] focus:ring-2 focus:ring-sky-200"
            />
            <button
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-[#2BAEFF] px-6 py-3 font-semibold text-white hover:opacity-95 disabled:opacity-50"
            >
              {loading ? "Preparing secure checkout…" : "Continue to payment"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        ) : (
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm email={email} planId={plan} cycle={cycle} clientSecret={clientSecret} />
          </Elements>
        )}
      </div>
    </div>
  );
}
