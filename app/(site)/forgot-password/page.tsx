"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string>("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Always returns 200 to avoid enumeration
      setSent(true);
    } catch {
      setSent(true);
    }
  };

  return (
    <main className="min-h-screen w-full bg-white">
      <div className="mx-auto max-w-[560px] px-4 py-16">
        {!sent ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <h1 className="text-2xl font-bold text-black">Forgot your password?</h1>
            <p className="text-sm text-black/70">
              Enter your email and we’ll send you a link to reset your password.
            </p>
            {err && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
            <label className="block">
              <span className="text-[12px] font-medium text-neutral-800">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-neutral-200 px-3 py-2 text-[14px]"
              />
            </label>
            <button
              type="submit"
              className="rounded-2xl bg-[#2AADFF] px-5 py-3 text-[15px] font-semibold text-white"
            >
              Send reset link
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-black">Check your email</h1>
            <p className="text-sm text-black/70">
              If an account exists for that email, you’ll receive a password reset link shortly.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
