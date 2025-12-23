// app/components/VerifyEmailBanner.tsx
"use client";

import * as React from "react";
import useSWR from "swr";

type Me = {
  email?: string | null;
  name?: string | null;
  emailVerified?: string | null; // ISO string when verified, null otherwise
};

const fetcher = async (url: string) => {
  const r = await fetch(url, { cache: "no-store", credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

export default function VerifyEmailBanner() {
  const { data: me, error, isLoading, mutate } = useSWR<Me>("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
  });

  // Local dismiss state—only for current session/view
  const [dismissed, setDismissed] = React.useState(false);

  // Cooldown state for resend
  const [cooldown, setCooldown] = React.useState(0);
  const [sending, setSending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // start a 30s cooldown after a successful send
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const resend = async () => {
    setErr(null);
    setMsg(null);

    if (!me?.email) {
      setErr("No email found on your profile.");
      return;
    }
    try {
      setSending(true);
      const res = await fetch("/api/auth/request-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: me.email }),
      });
      // Always returns ok:true in our design (no user enumeration)
      if (!res.ok) throw new Error(await res.text());

      setMsg("Verification link sent. Please check your inbox.");
      setCooldown(30);
    } catch (e: any) {
      setErr(e?.message || "Failed to send verification email.");
    } finally {
      setSending(false);
    }
  };

  // Don’t render if loading or failed to fetch me
  if (isLoading || error) return null;

  // Not showing if already verified or dismissed
  const isUnverified = !me?.emailVerified;
  if (!isUnverified || dismissed) return null;

  return (
    <div className="mb-3">
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 flex items-start gap-3">
        <div className="mt-0.5">⚠️</div>
        <div className="flex-1">
          <div className="font-semibold">Verify your email</div>
          <div className="mt-0.5">
            We’ve sent your verification link to <span className="font-medium">{me?.email}</span>.
            If you didn’t receive it, you can resend a new link. The link expires in <b>1 hour</b>.
          </div>

          {msg && (
            <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800">
              {msg}
            </div>
          )}
          {err && (
            <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-red-700">
              {err}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={resend}
              disabled={sending || cooldown > 0}
              className="rounded-lg bg-sky-600 text-white px-3 py-1.5 font-medium disabled:opacity-60"
            >
              {sending ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification"}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-lg border border-yellow-300 bg-white px-3 py-1.5 text-yellow-900"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Optional refresh button in case you verified in another tab */}
        <button
          type="button"
          onClick={() => mutate()}
          className="self-start rounded-md text-yellow-900/70 hover:text-yellow-900"
          title="Refresh status"
          aria-label="Refresh verification status"
        >
          ↻
        </button>
      </div>
    </div>
  );
}
