// app/components/Header.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { createPortal } from "react-dom";

export default function Header() {
  // Two independent popovers
  const [openTop, setOpenTop] = React.useState(false);
  const [openHero, setOpenHero] = React.useState(false);

  const topBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const heroBtnRef = React.useRef<HTMLButtonElement | null>(null);

  // Viewport-anchored positions
  const [posTop, setPosTop] = React.useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [posHero, setPosHero] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // (Hero) panel width we use to clamp within viewport
  const [heroWidth, setHeroWidth] = React.useState<number>(480);

  // Required for portals in Next.js (avoid SSR mismatch)
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const bookingsUrl = process.env.NEXT_PUBLIC_CALENDAR_URL;

  // Compute: align panel's RIGHT edge to button's RIGHT edge; 8px below button (TOP BAR)
  const computeRightAnchoredPos = (btn: HTMLButtonElement | null) => {
    if (!btn) return { top: 0, right: 0 };
    const r = btn.getBoundingClientRect();
    return {
      top: Math.round(r.bottom + 8),
      right: Math.round(window.innerWidth - r.right),
    };
  };

  // Compute: place panel to the RIGHT of the button; clamp within viewport (HERO)
  const computeLeftAnchoredPos = (btn: HTMLButtonElement | null, panelW: number) => {
    if (!btn) return { top: 0, left: 0 };
    const r = btn.getBoundingClientRect();
    const rawLeft = Math.round(r.right + 8); // start just to the right of the button
    const maxLeft = Math.round(window.innerWidth - 8 - panelW); // keep 8px margin
    const left = Math.max(8, Math.min(rawLeft, maxLeft));
    return {
      top: Math.round(r.bottom + 8),
      left,
    };
  };

  // Keep panels anchored while scrolling/resizing
  React.useEffect(() => {
    const onSync = () => {
      if (openTop) setPosTop(computeRightAnchoredPos(topBtnRef.current));
      if (openHero) setPosHero(computeLeftAnchoredPos(heroBtnRef.current, heroWidth));
    };
    if (openTop || openHero) {
      window.addEventListener("resize", onSync);
      window.addEventListener("scroll", onSync, { passive: true });
    }
    return () => {
      window.removeEventListener("resize", onSync);
      window.removeEventListener("scroll", onSync);
    };
  }, [openTop, openHero, heroWidth]);

  // Close on outside click (document-level)
  React.useEffect(() => {
    if (!openTop && !openHero) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      // The overlays have full-screen click-catchers; no extra checks needed here.
      // This exists in case something else bubbles.
      const target = e.target as HTMLElement;
      if (target.closest("#bookings-panel-top") || target.closest("#bookings-panel-hero")) return;
      setOpenTop(false);
      setOpenHero(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [openTop, openHero]);

  return (
    <header className="relative isolate overflow-hidden bg-white">
      {/* ===== Background VIDEO across entire header ===== */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <video
          src="/God rays new.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover object-top"
          preload="metadata"
        />
        <div className="absolute inset-0 bg-black/25" />
      </div>

      {/* === TOP BAR === */}
      <div className="mx-auto max-w-[1280px] 2xl:max-w-[1560px] px-5 sm:px-8 pt-4 pb-3">
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

          {/* Book a Live Demo (TOP BAR) */}
          <div className="relative">
            {bookingsUrl ? (
              <button
                ref={topBtnRef}
                type="button"
                onClick={() => {
                  setOpenHero(false);
                  setPosTop(computeRightAnchoredPos(topBtnRef.current));
                  setOpenTop((v) => !v);
                }}
                className="inline-flex items-center rounded-lg bg-white px-5 py-2.5 text-sky-500 font-medium hover:bg-sky-500 hover:text-white transition"
                aria-haspopup="dialog"
                aria-expanded={openTop}
                aria-controls="bookings-panel-top"
              >
                Book a Live Demo
              </button>
            ) : (
              <Link
                href="#"
                className="inline-flex items-center rounded-lg bg-white px-5 py-2.5 text-sky-500 font-medium hover:bg-sky-500 hover:text-white transition"
                title="Set NEXT_PUBLIC_CALENDAR_URL to enable inline calendar"
              >
                Book a Live Demo
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* === HERO COPY + RIGHT IMAGE === */}
      <div className="mx-auto max-w-[1280px] 2xl:max-w-[1560px] px-5 sm:px-8 pb-24 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8">
          {/* Left: Text */}
          <div className="max-w-2xl md:max-w-3xl">
            <h2 className="text-white text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight">
              No more Manual Entry
            </h2>
            <h3 className="mt-2 text-white text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight">
              Welcome to <em>AgileXtract!</em>
            </h3>

            <p className="mt-4 text-white/90 text-base sm:text-lg leading-7">
              Extract all key-fields from the Government Issued Documents in seconds
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="#test-drive"
                className="inline-flex items-center rounded-lg bg-sky-500 px-5 py-2.5 text-white font-medium hover:bg-Sky-500 transition hover:bg-white hover:text-sky-500"
              >
                Free Trial
              </Link>

              {/* HERO Book a Live Demo (opens to the RIGHT of this button) */}
              {bookingsUrl ? (
                <button
                  ref={heroBtnRef}
                  type="button"
                  onClick={() => {
                    setOpenTop(false);
                    // compute a responsive width for clamping (<= 90vw, max 480)
                    const w = Math.min(480, Math.floor(window.innerWidth * 0.9));
                    setHeroWidth(w);
                    setPosHero(computeLeftAnchoredPos(heroBtnRef.current, w));
                    setOpenHero((v) => !v);
                  }}
                  className="inline-flex items-center rounded-lg bg-white px-5 py-2.5 text-sky-500 font-medium hover:bg-sky-500 hover:text-white transition"
                  aria-haspopup="dialog"
                  aria-expanded={openHero}
                  aria-controls="bookings-panel-hero"
                >
                  Book a Live Demo
                </button>
              ) : (
                <Link
                  href="#contact"
                  className="inline-flex items-center rounded-lg bg-white px-5 py-2.5 text-sky-500 font-medium hover:bg-sky-500 hover:text-white transition"
                >
                  Book a Live Demo
                </Link>
              )}
            </div>
          </div>

          {/* Right: Hero Image over video */}
          <div className="relative flex justify-center md:justify-end">
            <Image
              src="/img on bg.png"
              alt="AgileXtract Illustration"
              width={500}
              height={500}
              className="w-full max-w-sm md:max-w-md lg:max-w-lg h-auto drop-shadow-2xl"
              priority
            />
          </div>
        </div>
      </div>

      {/* === Bottom robot (no curve) === */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[180px] md:h-[190px] lg:h-[220px]">
        <Image
          src="/robot2.png"
          alt="Robot"
          fill
          className="object-contain object-bottom"
          priority
        />
      </div>

      {/* ========= PORTAL OVERLAYS (above EVERYTHING) ========= */}
      {mounted && openTop &&
        createPortal(
          <div className="fixed inset-0 z-[2147483647]">
            <div className="absolute inset-0" onClick={() => setOpenTop(false)} />
            <div className="absolute" style={{ top: posTop.top, right: Math.max(8, posTop.right) }}>
              <div
                id="bookings-panel-top"
                role="dialog"
                aria-label="Book a Live Demo"
                className="rounded-xl border border-white/30 bg-white/95 shadow-xl backdrop-blur overflow-hidden"
                style={{ width: "min(90vw, 480px)" }}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                  <div className="text-sm font-medium text-gray-700">Schedule a live demo</div>
                  <button onClick={() => setOpenTop(false)} className="p-1 rounded-md hover:bg-gray-100" aria-label="Close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="w-full h-[540px] sm:h-[560px]">
                  <iframe
                    src={bookingsUrl!}
                    title="Bookings Calendar"
                    className="w-full h-full"
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

      {mounted && openHero &&
        createPortal(
          <div className="fixed inset-0 z-[2147483647]">
            {/* transparent backdrop: click to close */}
            <div className="absolute inset-0" onClick={() => setOpenHero(false)} />
            {/* anchored to the RIGHT of the hero button */}
            <div className="absolute" style={{ top: posHero.top, left: posHero.left }}>
              <div
                id="bookings-panel-hero"
                role="dialog"
                aria-label="Book a Live Demo"
                className="rounded-xl border border-white/30 bg-white/95 shadow-xl backdrop-blur overflow-hidden"
                style={{ width: `min(90vw, ${heroWidth}px)` }} // responsive width; prevents overflow
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                  <div className="text-sm font-medium text-gray-700">Schedule a live demo</div>
                  <button onClick={() => setOpenHero(false)} className="p-1 rounded-md hover:bg-gray-100" aria-label="Close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="w-full h-[540px] sm:h-[560px]">
                  <iframe
                    src={bookingsUrl!}
                    title="Bookings Calendar"
                    className="w-full h-full"
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
