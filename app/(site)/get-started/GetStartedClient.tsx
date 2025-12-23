// app/get-started/GetStartedClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  plan: "free" | "basic" | "premium";
  cycle: "monthly" | "yearly";
};

export default function GetStartedClient({ plan, cycle }: Props) {
  const router = useRouter();

  // form state
  const [email, setEmail] = useState("");
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateProv, setStateProv] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");

  // auth-awareness
  const [knownEmail, setKnownEmail] = useState<string | null>(null);
  const [checkingMe, setCheckingMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // timers to clean up if navigating away (kept as-is for safety)
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // Check current user and plan once on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) throw new Error("me failed");
        const me = await res.json();

        if (cancelled) return;

        // If user already has a plan, send them to dashboard
        if (me?.plan) {
          router.replace("/dashboard");
          return;
        }

        // If logged in (email present), prefill & lock email
        if (me?.email) {
          setKnownEmail(me.email as string);
          setEmail(me.email as string);
        }
      } catch {
        // not logged in is fine — email remains editable
      } finally {
        if (!cancelled) setCheckingMe(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");

    // If user was logged in (knownEmail), don’t allow submitting a different email
    if (knownEmail && knownEmail.toLowerCase() !== email.trim().toLowerCase()) {
      setErr("You’re signed in as a different email. Please use the same account or sign out.");
      return;
    }

    setLoading(true);

    const profile = {
      firstName,
      lastName,
      dob,
      gender,
      address,
      city,
      state: stateProv,
      zip,
      country,
      selectedAt: new Date().toISOString(),
    };

    try {
      // Save intake/profile + selected plan/cycle.
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan, cycle, profile }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any));
        throw new Error(data?.error ?? "Could not save your details. Please try again.");
      }

      // ✅ Redirect straight to Stripe checkout page (client-side)
      // We pass plan/cycle/email so /checkout can price & prefill accordingly.
      const params = new URLSearchParams({
        plan,
        cycle,
        email: email.trim(),
      });
      router.push(`/checkout?${params.toString()}`);
    } catch (e: any) {
      setErr(e?.message || "Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold">Get Started</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Plan: <span className="font-medium capitalize">{plan}</span> · Billing:{" "}
          <span className="font-medium">{cycle}</span>
        </p>

        {/* Busy state while checking current user/plan once */}
        {checkingMe && (
          <div className="mt-4 text-sm text-neutral-600">Preparing your form…</div>
        )}

        {err && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        {!checkingMe && (
          <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="First name" value={firstName} onChange={setFirst} required />
              <Input label="Last name" value={lastName} onChange={setLast} required />
            </div>

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              required
              disabled={!!knownEmail}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input label="Date of birth" type="date" value={dob} onChange={setDob} />
              <Select
                label="Gender"
                value={gender}
                onChange={setGender}
                options={[
                  { value: "", label: "Select" },
                  { value: "female", label: "Female" },
                  { value: "male", label: "Male" },
                  { value: "other", label: "Other" },
                  { value: "prefer_not_to_say", label: "Prefer not to say" },
                ]}
              />
              <Input label="Zip / Postal code" value={zip} onChange={setZip} />
            </div>

            <Input label="Address" value={address} onChange={setAddress} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input label="City" value={city} onChange={setCity} />
              <Input label="State / Province" value={stateProv} onChange={setStateProv} />
              <Input label="Country" value={country} onChange={setCountry} />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-neutral-700 hover:bg-neutral-50"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-black px-5 py-2.5 text-white hover:opacity-90 disabled:opacity-60"
                aria-haspopup="dialog"
              >
                {loading ? "Saving..." : "Continue"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

/* ——— tiny UI helpers ——— */
function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-800">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 disabled:bg-neutral-100 disabled:text-neutral-500"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-800">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
