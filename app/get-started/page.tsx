// // app/get-started/page.tsx
// "use client";

// import { useSearchParams, useRouter } from "next/navigation";
// import { useState } from "react";

// type Cycle = "monthly" | "yearly";
// type PlanIn = "free" | "basic" | "premium" | "professional";

// export default function GetStartedPage() {
//   const sp = useSearchParams();
//   const router = useRouter();

//   const plan = (sp.get("plan") ?? "basic").toLowerCase() as PlanIn;
//   const cycle = (sp.get("cycle") ?? "monthly").toLowerCase() as Cycle;

//   const [form, setForm] = useState({
//     email: "",
//     firstName: "",
//     lastName: "",
//     dob: "",
//     gender: "",
//     phone: "",
//     address1: "",
//     address2: "",
//     city: "",
//     state: "",
//     country: "",
//     postalCode: "",
//   });
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState<string | null>(null);

//   function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
//     setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
//   }

//   async function onSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     setErr(null);
//     setLoading(true);

//     try {
//       const res = await fetch("/api/checkout", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           plan,
//           cycle,
//           email: form.email.trim(),
//           profile: {
//             firstName: form.firstName,
//             lastName: form.lastName,
//             dob: form.dob,
//             gender: form.gender,
//             phone: form.phone,
//             address: {
//               address1: form.address1,
//               address2: form.address2,
//               city: form.city,
//               state: form.state,
//               country: form.country,
//               postalCode: form.postalCode,
//             },
//           },
//         }),
//       });

//       const data = await res.json();
//       if (!res.ok) {
//         setErr(data.error || "Unable to start checkout");
//         setLoading(false);
//         return;
//       }

//       // Server returns a URL: for FREE it's a local success path, otherwise Stripe/Payment Link.
//       window.location.href = data.url as string;
//     } catch (e: any) {
//       setErr("Network error");
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="max-w-2xl mx-auto px-6 py-10">
//       <h1 className="text-2xl font-bold">Tell us about you</h1>
//       <p className="text-gray-600 mt-1">
//         Plan: <strong className="uppercase">{plan}</strong> • Billing:{" "}
//         <strong>{cycle}</strong>
//       </p>

//       <form onSubmit={onSubmit} className="mt-6 grid gap-4">
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//           <input required name="firstName" placeholder="First name" className="border rounded p-3" value={form.firstName} onChange={onChange}/>
//           <input required name="lastName" placeholder="Last name" className="border rounded p-3" value={form.lastName} onChange={onChange}/>
//         </div>

//         <input required type="email" name="email" placeholder="Email" className="border rounded p-3" value={form.email} onChange={onChange}/>

//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//           <input name="dob" type="date" placeholder="Date of birth" className="border rounded p-3" value={form.dob} onChange={onChange}/>
//           <select name="gender" className="border rounded p-3" value={form.gender} onChange={onChange}>
//             <option value="">Gender (optional)</option>
//             <option>Female</option>
//             <option>Male</option>
//             <option>Prefer not to say</option>
//             <option>Other</option>
//           </select>
//         </div>

//         <input name="phone" placeholder="Phone" className="border rounded p-3" value={form.phone} onChange={onChange}/>

//         <input name="address1" placeholder="Address line 1" className="border rounded p-3" value={form.address1} onChange={onChange}/>
//         <input name="address2" placeholder="Address line 2 (optional)" className="border rounded p-3" value={form.address2} onChange={onChange}/>

//         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//           <input name="city" placeholder="City" className="border rounded p-3" value={form.city} onChange={onChange}/>
//           <input name="state" placeholder="State/Province" className="border rounded p-3" value={form.state} onChange={onChange}/>
//           <input name="postalCode" placeholder="Postal code" className="border rounded p-3" value={form.postalCode} onChange={onChange}/>
//         </div>

//         <input name="country" placeholder="Country" className="border rounded p-3" value={form.country} onChange={onChange}/>

//         {err && <p className="text-red-600 text-sm">{err}</p>}

//         <button disabled={loading} className="mt-2 rounded bg-[#2BAEFF] text-white px-5 py-3 font-semibold">
//           {loading ? "Please wait…" : "Continue to payment"}
//         </button>
//       </form>
//     </div>
//   );
// }


//////////////////////////////////////////

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

export default function GetStartedPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // read plan/cycle from URL
  const plan = useMemo(() => {
    const p = (sp.get("plan") || "basic").toLowerCase();
    return p === "professional" ? "premium" : (["free","basic","premium"].includes(p) ? p : "basic");
  }, [sp]);

  const cycle = useMemo(() => {
    const c = (sp.get("cycle") || "monthly").toLowerCase();
    return c === "yearly" ? "yearly" : "monthly";
  }, [sp]);

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

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // coming-soon modal
  const [showModal, setShowModal] = useState(false);
  const [seconds, setSeconds] = useState(5);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
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

    // save only (no Stripe)
    const res = await fetch("/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, plan, cycle, profile }),
    }).catch(() => null);

    setLoading(false);

    if (!res || !res.ok) {
      const data = await res?.json().catch(() => ({} as any));
      setErr(data?.error ?? "Could not save your details. Please try again.");
      return; // keep form filled
    }

    // Show "Coming soon", then redirect home
    setShowModal(true);
    setSeconds(5);
    const iv = setInterval(() => setSeconds((s) => s - 1), 1000);
    const to = setTimeout(() => {
      clearInterval(iv);
      router.push("/");
    }, 5000);

    // cleanup if navigate early
    return () => {
      clearInterval(iv);
      clearTimeout(to);
    };
  }

  // Optional: ESC to close modal
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShowModal(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal]);

  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold">Get Started</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Plan: <span className="font-medium capitalize">{plan}</span> · Billing:{" "}
          <span className="font-medium">{cycle}</span>
        </p>

        {err && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="First name" value={firstName} onChange={setFirst} required />
            <Input label="Last name" value={lastName} onChange={setLast} required />
          </div>

          <Input label="Email" type="email" value={email} onChange={setEmail} required />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="City" value={city} onChange={setCity} />
            <Input label="State / Province" value={stateProv} onChange={setStateProv} />
            <Input label="Country" value={country} onChange={setCountry} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            >
              Back
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-black text-white hover:opacity-90 disabled:opacity-60"
              aria-haspopup="dialog"
            >
              {loading ? "Saving..." : "Continue to payment"}
            </button>
          </div>
        </form>
      </section>

      {/* Coming Soon Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-xl font-semibold">Coming Soon</h2>
            <p className="mt-2 text-neutral-600">
              We’re updating our pricing. You’ll be redirected to the homepage in{" "}
              <span className="font-medium">{seconds}</span> sec.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  router.push("/");
                }}
                className="px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              >
                Go now
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90"
              >
                Stay here
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ——— UI helpers ——— */
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
        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
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
