// app/components/ContactSection.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type FormState = {
  name: string;
  company: string;
  email: string;
  areaCode: string;
  phone: string;
  message: string;
};

type ToastState =
  | { open: false }
  | {
      open: true;
      kind: "success" | "error";
      text: string;
    };

export default function ContactSection() {
  const [form, setForm] = useState<FormState>({
    name: "",
    company: "",
    email: "",
    areaCode: "",
    phone: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState>({ open: false });
  const timerRef = useRef<number | null>(null);

  // Auto-hide the toast after 3s
  useEffect(() => {
    if (!toast.open) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setToast({ open: false });
    }, 3000) as unknown as number;
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [toast]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to submit");
      }

      setForm({
        name: "",
        company: "",
        email: "",
        areaCode: "",
        phone: "",
        message: "",
      });

      setToast({
        open: true,
        kind: "success",
        text: "Request submitted successfully. We’ll get back to you shortly!",
      });
    } catch (e: any) {
      const msg = e?.message || "Something went wrong. Please try again.";
      setErr(msg);
      setToast({ open: true, kind: "error", text: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    // Anchor + small offset if you have a sticky header
    <section id="contact" className="bg-white scroll-mt-10">
      <div className="mx-auto max-w-6xl px-6 sm:px-8 py-10">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* LEFT: Copy + details */}
          <div>
            <h2 className="text-5xl sm:text-6xl font-bold text-
            sky-500">Get in Touch</h2>

            <h3 className="mt-8 text-3xl font-semibold text-gray-900">
              Ready to streamline your document processing?
            </h3>

            <p className="mt-4 max-w-xl text-gray-600 leading-7">
              Our team will connect with you to understand your needs and walk you through
              the solution step-by-step. Whether you want to accelerate customer onboarding,
              eliminate manual labour or automate identity verification, AgileXtract is here
              to help!
            </p>

            <ul className="mt-10 space-y-4 text-gray-900">
              <li className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22 16.92v3a2 2 0 0 1-2.18 2A19.7 19.7 0 0 1 3.11 5.18 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.72c.12.9.31 1.77.57 2.6a2 2 0 0 1-.45 2.11L9.09 10a16 16 0 0 0 6.83 6.83l.57-1.13a2 2 0 0 1 2.11-.45c.83.26 1.7.45 2.6.57A2 2 0 0 1 22 16.92z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="text-lg">+971 4 547 4711</span>
              </li>

              <li className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                    <path
                      d="m22 6-10 7L2 6"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="text-lg">agile@agilemtech.ae</span>
              </li>

              <li className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1 1 18 0Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.7" />
                  </svg>
                </span>
                <span className="text-lg">Office 2113 Silicon IT Tower Dubai Silicon Oasis UAE</span>
              </li>
            </ul>
          </div>

          {/* RIGHT: Form card */}
          <div
            className="rounded-[28px] p-6 sm:p-8"
            style={{
              background:
                "radial-gradient(125% 100% at 0% 0%, #0B3658 0%, #08243b 55%, #041622 100%)",
            }}
          >
            <form onSubmit={onSubmit} className="space-y-4">
              <Input
                placeholder="Your Name"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                required
              />
              <Input
                placeholder="Company Name"
                value={form.company}
                onChange={(v) => setForm({ ...form, company: v })}
              />
              <Input
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                required
              />

              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="Area Code"
                  value={form.areaCode}
                  onChange={(v) => setForm({ ...form, areaCode: v })}
                />
                <div className="col-span-2">
                  <Input
                    placeholder="Phone Number"
                    value={form.phone}
                    onChange={(v) => setForm({ ...form, phone: v })}
                  />
                </div>
              </div>

              <Textarea
                placeholder="Kindly provide enough information about your queries..."
                rows={4}
                value={form.message}
                onChange={(v) => setForm({ ...form, message: v })}
              />

              {err && <p className="text-rose-300 text-sm">{err}</p>}

              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 font-semibold text-white hover:bg-sky-600 transition disabled:opacity-60"
              >
                {loading && (
                  <svg
                    className="h-5 w-5 animate-spin text-white/90"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-90"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
                    />
                  </svg>
                )}
                <span>{loading ? "Sending..." : "Submit Request"}</span>
                {!loading && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M5 12h14M13 5l7 7-7 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ===== Centered Success/Error Popup ===== */}
      {toast.open && (
        <div
          className={[
            "fixed inset-0 z-[120] flex items-center justify-center",
            "bg-black/30 backdrop-blur-[1px]",
          ].join(" ")}
          aria-live="polite"
          role="status"
        >
          <div
            className={[
              "relative w-[90%] max-w-md rounded-2xl shadow-2xl ring-1 ring-black/10 px-6 py-6",
              "transition-transform duration-150 ease-out",
            ].join(" ")}
            style={{
              background:
                "radial-gradient(130% 120% at 0% 0%, #0B3658 0%, #08243b 55%, #041622 100%)",
            }}
          >
            {/* Close */}
            <button
              onClick={() => setToast({ open: false })}
              className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-gray-800 shadow hover:bg-white"
              aria-label="Close notification"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <div className="flex items-start gap-3">
              <div
                className={[
                  "inline-flex h-10 w-10 items-center justify-center rounded-full",
                  toast.kind === "success"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/20 text-rose-300",
                ].join(" ")}
              >
                {toast.kind === "success" ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M20 7 9 18l-5-5"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 9v4m0 4h.01M10 2h4l8 8v12H2V10L10 2z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              <div>
                <h4 className="text-white text-lg font-semibold">
                  {toast.kind === "success" ? "Request Submitted" : "Submission Failed"}
                </h4>
                <p className="mt-1 text-white/85">{toast.text}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- Small styled inputs ---------- */
function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full rounded-xl bg-white/10 text-white placeholder-white/70 px-4 py-3 outline-none
                 ring-1 ring-white/20 focus:ring-2 focus:ring-sky-300"
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-xl bg-white/10 text-white placeholder-white/70 px-4 py-3 outline-none
                 ring-1 ring-white/20 focus:ring-2 focus:ring-sky-300 resize-y"
    />
  );
}
