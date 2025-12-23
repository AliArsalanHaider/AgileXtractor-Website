// app/components/CheckoutForm.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function CheckoutForm() {
  const q = useSearchParams();
  // read defaults from query (e.g., from GetStarted flow)
  const plan  = (q.get("plan")  as "free" | "basic" | "premium") || "basic";
  const cycle = (q.get("cycle") as "monthly" | "yearly") || "monthly";
  const emailPrefill = q.get("email") ?? "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState(emailPrefill);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    if (!email || !password) return setErr("Email and password are required.");
    if (password !== confirm) return setErr("Passwords do not match.");
    if (!["basic", "premium"].includes(plan)) return setErr("Invalid plan.");

    setLoading(true);
    try {
      const res = await fetch("/api/checkout/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name, email, password, plan, cycle,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        throw new Error(j?.error || `Failed (HTTP ${res.status})`);
      }
      const { url } = await res.json();
      window.location.href = url; // Go to Stripe Checkout
    } catch (e: any) {
      setErr(e?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="block text-sm font-medium">Full name</label>
        <input
          className="mt-1 w-full rounded-md border px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          className="mt-1 w-full rounded-md border px-3 py-2"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Confirm password</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </div>
      </div>

      <div className="rounded-md bg-slate-50 p-3 text-sm">
        <div><b>Plan:</b> {plan}</div>
        <div><b>Billing:</b> {cycle}</div>
      </div>

      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-black px-5 py-2.5 text-white disabled:opacity-60"
      >
        {loading ? "Redirecting…" : "Continue to secure checkout"}
      </button>
    </form>
  );
}
