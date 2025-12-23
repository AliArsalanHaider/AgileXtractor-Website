// app/checkout/page.tsx
import CheckoutForm from "@/app/components/checkoutForm";

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold">Secure Checkout</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Create your account and finish payment.
        </p>
        <div className="mt-6">
          <CheckoutForm />
        </div>
      </section>
    </main>
  );
}
