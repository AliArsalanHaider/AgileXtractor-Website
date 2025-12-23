// app/login/LoginClient.tsx
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { setAuthUser } from "@/lib/auth-client";



declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/#pricing";

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // keep email/password flow
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);

  // GIS script + ready state
  const [gisLoaded, setGisLoaded] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const initializedRef = useRef(false);

  // Where Google will render its official button (“Continue with Google”)
  const gsiBtnRef = useRef<HTMLDivElement | null>(null);

  // Script onLoad
  const onGisScriptLoad = () => setGisLoaded(true);

  // Poll for window.google if some CSP/extension delays it
  useEffect(() => {
    if (gisReady) return;
    let tries = 0;
    const iv = setInterval(() => {
      if (window.google?.accounts?.id) {
        setGisReady(true);
        clearInterval(iv);
      } else if (++tries >= 40) {
        clearInterval(iv);
      }
    }, 100);
    return () => clearInterval(iv);
  }, [gisReady]);

  // Also mark ready when script load says so
  useEffect(() => {
    if (gisLoaded && window.google?.accounts?.id) setGisReady(true);
  }, [gisLoaded]);

  // Initialize GIS and render the official Google button into our div
  useEffect(() => {
    if (!gisReady || !clientId || initializedRef.current) return;
    if (!gsiBtnRef.current) return;

    const google = window.google;
    google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential?: string }) => {
        if (!response?.credential) {
          setErr("Google sign-in cancelled");
          return;
        }
        try {
          setLoading(true);
          setErr("");
          const r = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: response.credential }),
          });
          const j = await r.json().catch(() => ({} as any));
          if (!r.ok || !j?.ok) {
            setErr(j?.error || "Google login failed");
            return;
          }
          setAuthUser({ email: j.user?.email, firstName: j.user?.name });
          router.push("/dashboard"); // or branch via /api/auth/me
        } catch {
          setErr("Google login failed");
        } finally {
          setLoading(false);
        }
      },
      ux_mode: "popup",
      auto_select: false,
      itp_support: true,
    });

    // Render the BUTTON (this is your “Continue with Google”)
    google.accounts.id.renderButton(gsiBtnRef.current, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: 360, // matches your form width nicely
      logo_alignment: "left",
    });

    initializedRef.current = true;
  }, [gisReady, clientId, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setErr(j?.error || "Login failed");
        return;
      }

      setAuthUser({ email });

      const me = await fetch("/api/auth/me", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null);
      const hasPlan = !!me?.plan;
      router.push(hasPlan ? "/dashboard" : next);
    } catch {
      setErr("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-white">
      {/* Load Google Identity Services once */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={onGisScriptLoad}
      />

      <div className="mx-auto max-w-[1000px] px-4 py-10">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* LEFT: form */}
          <section id="login" className="flex flex-col items-center">
            <div className="mb-5">
              <Image src="/X.png" alt="AgileXtract mark" width={56} height={56} priority />
            </div>

            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-black">Welcome Back</h1>
              <p className="mt-1 text-[13px] text-black/60">Welcome back! Please enter your details</p>
            </div>

            <form onSubmit={onSubmit} className="w-full max-w-[360px] space-y-4" aria-label="Log in form">
              {err && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {err}
                </div>
              )}

              {/* 👉 This is the ONLY Google button now (official “Continue with Google”) */}
              <div ref={gsiBtnRef} className="w-full flex justify-center" />

              {/* Divider */}
              <div className="flex items-center gap-4 text-[12px] font-medium text-black">
                <div className="h-px flex-1 bg-black/70" />
                <span className="whitespace-nowrap">Or log in with email</span>
                <div className="h-px flex-1 bg-black/70" />
              </div>

              {/* Email */}
              <label className="block">
                <span className="sr-only">Your Email</span>
                <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-[15px] ring-1 ring-neutral-200">
                  <span className="inline-flex w-5 justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 6h16a2 2 0 0 1 2 2v.3l-10 6.25L2 8.3V8a2 2 0 0 1 2-2Z" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M22 10.5v5.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5.5" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Your Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-transparent text-[15px] text-neutral-800 placeholder:text-neutral-400 outline-none"
                  />
                </div>
              </label>

              {/* Password */}
              <label className="block">
  <span className="sr-only">Password</span>
  <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-[15px] ring-1 ring-neutral-200">
    <span className="inline-flex w-5 justify-center">
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="10" width="16" height="10" rx="2" fill="none" stroke="black" strokeWidth="1.5" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>

    <input
      type={showPassword ? "text" : "password"}
      autoComplete="current-password"
      placeholder="Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      required
      className="w-full bg-transparent text-[15px] text-neutral-800 placeholder:text-neutral-400 outline-none"
    />

    {/* 👉 Show/Hide eye icon */}
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="text-neutral-500 hover:text-neutral-700"
    >
      {showPassword ? (
        // 👁️ Open eye (showing password)
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="black" strokeWidth="1.5"/>
          <circle cx="12" cy="12" r="3" stroke="black" strokeWidth="1.5" />
        </svg>
      ) : (
        // 🙈 Closed eye (hidden password)
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M1 12s4-7 11-7c2.5 0 4.7.8 6.5 2" stroke="black" strokeWidth="1.5"/>
          <path d="M23 12s-4 7-11 7c-2.5 0-4.7-.8-6.5-2" stroke="black" strokeWidth="1.5"/>
          <path d="M4 4l16 16" stroke="black" strokeWidth="1.5"/>
        </svg>
      )}
    </button>
  </div>
</label>


              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border border-neutral-300 text-sky-500 focus:ring-sky-500"
                  />
                  <span className="text-[13px] font-medium text-black">
                    Remember me
                  </span>
                </label>
                <a href="/forgot-password#forgot-password" className="text-[13px] font-medium text-black underline underline-offset-4 hover:opacity-80">
                  Forgot password?
                </a>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[#2AADFF] px-5 py-3 text-center text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Logging in…" : "Log In"}
              </button>

              {/* Signup link */}
              <p className="text-center text-[13px]">
                <span className="text-neutral-400">Don’t have an account? </span>
                <a href="/signup#signup" className="text-black font-medium hover:opacity-80">
                  Sign up
                </a>
              </p>
            </form>
          </section>

          {/* RIGHT panel (unchanged) */}
          <section className="relative h-[620px] overflow-hidden rounded-3xl bg-[#0b1b2a] ring-1 ring-white/15">
            <video className="absolute inset-0 h-full w-full object-cover" src="/God rays new.mp4" autoPlay loop muted playsInline />
            <div className="pointer-events-none absolute top-6 inset-x-0 z-20 flex justify-center">
              <div className="flex items-baseline gap-1 text-5xl font-bold italic text-white/10 leading-none tracking-[-0.02em]" aria-label="AgileXtract">
                <span className="inline-block">Agile</span>
                <Image src="/X White.png" alt="X" width={96} height={96} priority className="h-[1.8em] w-auto align-baseline inline-block translate-y-[0.32em] -mx-px" />
                <span className="inline-block">tract</span>
              </div>
            </div>
            <div className="absolute inset-0 grid place-items-center">
              <div className="translate-y-16 md:translate-y-20">
                <Image src="/img on bg.png" alt="Illustration" width={360} height={360} className="drop-shadow-[0_10px_48px_rgba(0,157,255,0.5)]" priority />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/25" />
          </section>
        </div>
      </div>
    </main>
  );
}
