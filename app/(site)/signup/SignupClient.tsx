"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizeEmail as maybeNormalize } from "@/lib/email-util"; // keep if you have it

const normalizeEmail = (e: string) => {
  try {
    if (typeof maybeNormalize === "function") return maybeNormalize(e);
  } catch {}
  return e.toLowerCase().trim();
};

export default function SignupClient() {
  const router = useRouter();

  // form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // REQUIRED
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateProv, setStateProv] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");

  // ui state
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string>(""); // email used in signup
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setResendMsg("");

    if (!firstName || !lastName) return setErr("Please enter your first and last name.");
    if (!email) return setErr("Please enter your email.");
    if (!password || password.length < 8) {
      return setErr("Password must be at least 8 characters long.");
    }

    setLoading(true);

    const displayName = `${firstName ?? ""} ${lastName ?? ""}`.trim() || email.split("@")[0];
    const normalizedEmail = normalizeEmail(email);

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

    const readError = async (res: Response) => {
      try {
        const t = await res.text();
        try {
          const j = JSON.parse(t);
          return j?.error || t || `HTTP ${res.status}`;
        } catch {
          return t || `HTTP ${res.status}`;
        }
      } catch {
        return `HTTP ${res.status}`;
      }
    };

    try {
      // (1) Create user, hash password on the server, send verification email there.
      {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            name: displayName,
            password,
          }),
        });
        if (!res.ok) throw new Error(await readError(res));
      }

      // (2) Save the profile/intake (your existing endpoint).
      {
        const res = await fetch("/api/intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, profile }),
        });
        if (!res.ok) throw new Error(await readError(res));
      }

      router.replace(`/verify-sent?email=${encodeURIComponent(normalizedEmail)}`);
      } catch (e: any) {
        setErr(e?.message || "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
  }

  async function resendVerification() {
    if (!pendingEmail) return;
    try {
      setResendBusy(true);
      setResendMsg("");
      const res = await fetch("/api/auth/request-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });
      if (!res.ok) throw new Error();
      setResendMsg("Verification email sent. Please check your inbox.");
    } catch {
      setResendMsg("Could not send email. Try again in a moment.");
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <main className="min-h-screen w-full bg-white">
      <div className="mx-auto max-w-[1000px] px-4 py-10">
        <div className="grid items-stretch gap-10 lg:grid-cols-2">
          {/* LEFT: form */}
          <section id="signup" className="flex flex-col items-center">
            <div className="mb-5">
              <Image src="/X.png" alt="AgileXtract mark" width={56} height={56} priority />
            </div>

            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-black">Create your account</h1>
              <p className="mt-1 text-[13px] text-black/60">Enter your details to get started</p>
            </div>

            <form onSubmit={onSubmit} className="w-full max-w-[380px] space-y-4" noValidate>
              {err && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {err}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input label="First name" value={firstName} onChange={setFirst} required />
                <Input label="Last name" value={lastName} onChange={setLast} required />
              </div>

              <Input label="Email" type="email" value={email} onChange={setEmail} required />
              <Input label="Password" type="password" value={password} onChange={setPassword} required />

              <div className="grid grid-cols-3 gap-3">
                <Input label="Date of birth" type="date" value={dob} onChange={setDob} />
                <Field label="Gender">
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-[14px] text-neutral-800 focus:outline-none focus:ring-2 focus:ring-black/10"
                  >
                    <option value="">Select</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </Field>
                <Input label="Zip / Postal code" value={zip} onChange={setZip} />
              </div>

              <Input label="Address" value={address} onChange={setAddress} />
              <div className="grid grid-cols-3 gap-3">
                <Input label="City" value={city} onChange={setCity} />
                <Input label="State / Province" value={stateProv} onChange={setStateProv} />
                <Input label="Country" value={country} onChange={setCountry} />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[#2AADFF] px-5 py-3 text-center text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Creating account…" : "Continue"}
              </button>

              <p className="text-center text-[13px]">
                <span className="text-neutral-400">Already have an account? </span>
                <a href="/login#login" className="font-medium text-black hover:opacity-80">
                  Log in
                </a>
              </p>
            </form>
          </section>

          {/* RIGHT visual */}
          <RightPanel />
        </div>
      </div>

      {/* ✅ Modal shown ONLY after successful signup request */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold">Verify your email</h2>
            <p className="mt-2 text-[14px] text-neutral-700">
              We’ve sent a verification link to{" "}
              <span className="font-medium">{pendingEmail}</span>. Please click the link to verify your account.
              The link expires in 1 hour.
            </p>

            {resendMsg && (
              <div className="mt-3 rounded-md border px-3 py-2 text-sm
                 {resendMsg.startsWith('Verification') ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}">
                {resendMsg}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => router.replace("/login")}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
              >
                Go to login
              </button>
              <button
                onClick={resendVerification}
                disabled={resendBusy}
                className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
              >
                {resendBusy ? "Sending…" : "Resend link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function RightPanel() {
  return (
    <section className="relative self-stretch overflow-hidden rounded-3xl bg-[#0b1b2a] ring-1 ring-white/15">
      <video className="absolute inset-0 h-full w-full object-cover" src="/God rays new.mp4" autoPlay loop muted playsInline />
      <div className="pointer-events-none absolute top-6 inset-x-0 z-20 flex justify-center">
        <div
          className="flex items-baseline gap-1 text-5xl font-bold italic text-white/10 leading-none tracking-[-0.02em]"
          aria-label="AgileXtract"
        >
          <span className="inline-block">Agile</span>
          <Image
            src="/X White.png"
            alt="X"
            width={120}
            height={120}
            priority
            className="inline-block h-[1.8em] w-auto -mx-px translate-y-[0.32em] align-baseline"
          />
          <span className="inline-block">tract</span>
        </div>
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <div className="translate-y-16 md:translate-y-20">
          <Image
            src="/img on bg.png"
            alt="Illustration"
            width={360}
            height={360}
            priority
            className="drop-shadow-[0_10px_48px_rgba(0,157,255,0.5)]"
          />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/25" />
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-left">
      <span className="text-[12px] font-medium text-neutral-800">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-left">
      <span className="text-[12px] font-medium text-neutral-800">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-[14px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/10"
      />
    </label>
  );
}
