// app/components/Header.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { createPortal } from "react-dom";
import { useAuthUser, logout, setAuthUser } from "@/lib/auth-client";
import { getIdentity } from "@/lib/identity";
import { usePathname } from "next/navigation";

export default function Header() {
  // --- state for hero popover ---
  const [openHero, setOpenHero] = React.useState(false);
  const heroBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const [heroWidth, setHeroWidth] = React.useState<number>(480);
  const [posHero, setPosHero] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Only run portals on client
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const bookingsUrl = process.env.NEXT_PUBLIC_CALENDAR_URL;

  const computeLeftAnchoredPos = (btn: HTMLButtonElement | null, panelW: number) => {
    if (!btn) return { top: 0, left: 0 };
    const r = btn.getBoundingClientRect();
    const rawLeft = Math.round(r.right + 8);
    const maxLeft = Math.round(window.innerWidth - 8 - panelW);
    const left = Math.max(8, Math.min(rawLeft, maxLeft));
    return { top: Math.round(r.bottom + 8), left };
  };

  const pathname = usePathname();
  const suppressOnThese = ["/signup", "/login", "/get-started"];
  const suppress = suppressOnThese.some((p) => pathname.startsWith(p));

  // Keep panel anchored while scrolling/resizing
  React.useEffect(() => {
    const onSync = () => {
      if (openHero) setPosHero(computeLeftAnchoredPos(heroBtnRef.current, heroWidth));
    };
    if (openHero) {
      window.addEventListener("resize", onSync);
      window.addEventListener("scroll", onSync, { passive: true } as any);
    }
    return () => {
      window.removeEventListener("resize", onSync);
      window.removeEventListener("scroll", onSync);
    };
  }, [openHero, heroWidth]);

  // Close on outside click
  React.useEffect(() => {
    if (!openHero) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("#bookings-panel-hero")) return;
      setOpenHero(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [openHero]);

  // Auth-aware header
  const { user } = useAuthUser();

  // Hydrate firstName from /api/auth/me if missing
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || (user as any).firstName) return;
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const nameFromApi: string | undefined =
          (data && (data.name || data?.profile?.firstName)) || undefined;
        if (!cancelled && nameFromApi) setAuthUser({ ...user, firstName: nameFromApi } as any);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function purgeClientIdentity() {
    try {
      const names = [
        "agx_email",
        "email",
        "displayName",
        "userName",
        "accountId",
        "auth_session",
        "access_token",
        "refresh_token",
      ];
      const host = typeof window !== "undefined" ? location.hostname.replace(/^www\./, "") : "";
      names.forEach((n) => {
        document.cookie = `${n}=; Max-Age=0; path=/;`;
        if (host) document.cookie = `${n}=; Max-Age=0; path=/; domain=.${host};`;
      });
      ["email", "userName", "accountId", "agx_usage_daily_v1", "agx_used_baseline_v1"].forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {}
      });
      (window as any).__USER__ = undefined;
    } catch {}
  }

  // Sync header on cross-tab auth changes
  React.useEffect(() => {
    const handleAuthChanged = () => {
      const id = getIdentity();
      if (!id.email) setAuthUser(null);
    };
    window.addEventListener("agx:auth-changed", handleAuthChanged);
    window.addEventListener("storage", handleAuthChanged);
    return () => {
      window.removeEventListener("agx:auth-changed", handleAuthChanged);
      window.removeEventListener("storage", handleAuthChanged);
    };
  }, []);

  const friendlyName = React.useMemo(() => {
    if (!user) return "";
    return (user as any).firstName || (user as any).email || "";
  }, [user]);

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    try {
      await logout();
    } catch {}
    purgeClientIdentity();
    setAuthUser(null);
    window.dispatchEvent(new Event("agx:auth-changed"));
    window.location.replace("/");
  }

  // ⛔️ IMPORTANT: No early returns before this point.
  // Decide to hide the header only *after* all hooks ran:
  if (suppress) return null;

  return (
    <header className="relative isolate overflow-hidden bg-white">
      {/* Background video */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <video
          src="/God rays new.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover object-top"
          preload="metadata"
        />
        <div className="absolute inset-0 bg-black/25" />
      </div>

      {/* Top bar */}
      <div className="mx-auto max-w-7xl 2xl:max-w-[1560px] px-5 sm:px-8 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="AgileXtract home" className="block">
            <Image
              src="/Logo.png"
              alt="AgileXtract"
              width={190}
              height={68}
              className="h-auto w-auto max-h-14"
              priority
            />
          </Link>

          {!user ? (
            <Link
              href="/login#login"
              className="inline-flex items-center rounded-lg bg-white px-5 py-2.5 font-medium text-sky-500 transition hover:bg-sky-500 hover:text-white"
            >
              Log In
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-white/90">Welcome, {friendlyName}</span>
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-lg bg-white px-5 py-2.5 font-medium text-sky-500 transition hover:bg-sky-500 hover:text-white"
              >
                View Dashboard
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:text-white"
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="mx-auto max-w-7xl 2xl:max-w-[1560px] px-5 sm:px-8 pb-24 pt-4">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
          <div className="max-w-2xl md:max-w-3xl">
            <h2 className="text-3xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl">
              No more Manual Entry
            </h2>
            <h3 className="mt-2 text-2xl font-semibold leading-tight text-white sm:text-3xl md:text-4xl">
              Welcome to <em>AgileXtract!</em>
            </h3>
            <p className="mt-4 text-base leading-7 text-white/90 sm:text-lg">
              Extract all key-fields from the Government Issued Documents in seconds
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="#test-drive"
                className="inline-flex items-center rounded-lg bg-sky-500 px-5 py-2.5 font-medium text-white transition hover:bg-white hover:text-sky-500"
              >
                Free Trial
              </Link>

              {bookingsUrl ? (
                <button
                  ref={heroBtnRef}
                  type="button"
                  onClick={() => {
                    const w = Math.min(480, Math.floor(window.innerWidth * 0.9));
                    setHeroWidth(w);
                    setPosHero(computeLeftAnchoredPos(heroBtnRef.current, w));
                    setOpenHero((v) => !v);
                  }}
                  className="inline-flex items-center rounded-lg bg-white px-5 py-2.5 font-medium text-sky-500 transition hover:bg-sky-500 hover:text-white"
                  aria-haspopup="dialog"
                  aria-expanded={openHero}
                  aria-controls="bookings-panel-hero"
                >
                  Book a Live Demo
                </button>
              ) : (
                <Link
                  href="#contact"
                  className="inline-flex items-center rounded-lg bg-white px-5 py-2.5 font-medium text-sky-500 transition hover:bg-sky-500 hover:text-white"
                >
                  Book a Live Demo
                </Link>
              )}
            </div>
          </div>

          <div className="relative flex justify-center md:justify-end">
            <Image
              src="/img on bg.png"
              alt="AgileXtract Illustration"
              width={500}
              height={500}
              className="h-auto w-full max-w-sm drop-shadow-2xl md:max-w-md lg:max-w-lg"
              priority
            />
          </div>
        </div>
      </div>

      {mounted &&
        openHero &&
        createPortal(
          <div className="fixed inset-0 z-2147483647">
            <div className="absolute inset-0" onClick={() => setOpenHero(false)} />
            <div className="absolute" style={{ top: posHero.top, left: posHero.left }}>
              <div
                id="bookings-panel-hero"
                role="dialog"
                aria-label="Book a Live Demo"
                className="overflow-hidden rounded-xl border border-white/30 bg-white/95 shadow-xl backdrop-blur"
                style={{ width: `min(90vw, ${heroWidth}px)` }}
              >
                <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
                  <div className="text-sm font-medium text-gray-700">Schedule a live demo</div>
                  <button
                    onClick={() => setOpenHero(false)}
                    className="rounded-md p-1 hover:bg-gray-100"
                    aria-label="Close"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="h-[540px] w-full sm:h-[560px]">
                  <iframe
                    src={bookingsUrl!}
                    title="Bookings Calendar"
                    className="h-full w-full"
                    style={{ border: 0 }}
                    allow="clipboard-write; web-share; fullscreen;"
                    referrerPolicy="no-referrer-when-downgrade"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}
