// app/(site)/checkout/page.tsx
import { Suspense } from "react";
import CheckoutForm from "@/app/components/CheckoutForm";

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold">Secure Checkout</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Create your account and finish payment.
        </p>
        <Suspense fallback={<div className="text-sm text-slate-600">Loading checkout…</div>}>
        <CheckoutForm />
      </Suspense>
      </section>
    </main>
  );
}
