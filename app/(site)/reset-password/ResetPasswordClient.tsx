"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const email = decodeURIComponent(sp.get("email") || "");
  const token = sp.get("token") || "";

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [err, setErr] = useState<string>("");
  const [ok, setOk] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    if (!email || !token) {
      setErr("Invalid or expired link.");
      return;
    }
    if (p1.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (p1 !== p2) {
      setErr("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password: p1 }),
      });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok || !j?.ok) {
        setErr(j?.error || "Reset failed.");
        return;
      }
      setOk(true);
      setTimeout(() => router.replace("/login#login"), 1200);
    } catch {
      setErr("Reset failed.");
    }
  };

  return (
    <main className="min-h-screen w-full bg-white">
      <div className="mx-auto max-w-[560px] px-4 py-16">
        {!ok ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <h1 className="text-2xl font-bold text-black">Set a new password</h1>
            <p className="text-sm text-black/70">
              for <strong>{email || "your account"}</strong>
            </p>
            {err && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {err}
              </div>
            )}
            <label className="block">
              <span className="text-[12px] font-medium text-neutral-800">
                New password
              </span>
              <input
                type="password"
                required
                value={p1}
                onChange={(e) => setP1(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-neutral-200 px-3 py-2 text-[14px]"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-neutral-800">
                Confirm password
              </span>
              <input
                type="password"
                required
                value={p2}
                onChange={(e) => setP2(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-neutral-200 px-3 py-2 text-[14px]"
              />
            </label>
            <button
              type="submit"
              className="rounded-2xl bg-[#2AADFF] px-5 py-3 text-[15px] font-semibold text-white"
            >
              Save new password
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-black">Password updated</h1>
            <p className="text-sm text-black/70">Redirecting to log in…</p>
          </div>
        )}
      </div>
    </main>
  );
}
