// app/components/Header.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function Header() {
  // Toggle inline calendar near the top-bar button
  const [open, setOpen] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const btnRef = React.useRef<HTMLButtonElement | null>(null);

  // Your public Microsoft Bookings (or Outlook published calendar) URL
  const bookingsUrl = process.env.NEXT_PUBLIC_CALENDAR_URL;

  // Close the panel when clicking outside
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (btnRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

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
        {/* Darken for text contrast */}
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

          {/* Book a Live Demo (top bar) */}
          <div className="relative">
            {bookingsUrl ? (
              <>
                <button
                  ref={btnRef}
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-sky-500 hover:bg-sky-500 hover:text-white transition"
                  aria-haspopup="dialog"
                  aria-expanded={open}
                  aria-controls="bookings-panel"
                >
                  Book a Live Demo
                </button>

                {/* Inline calendar panel */}
                {open && (
                  <div
                    id="bookings-panel"
                    ref={panelRef}
                    role="dialog"
                    aria-label="Book a Live Demo"
                    className="absolute right-0 mt-2 w-[380px] max-w-[90vw] rounded-xl border border-white/30 bg-white/95 shadow-xl backdrop-blur
                               sm:w-[420px] sm:max-w-[92vw] lg:w-[480px] lg:max-w-[40rem] overflow-hidden z-50"
                  >
                    {/* Header row inside panel */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                      <div className="text-sm font-medium text-gray-700">Schedule a live demo</div>
                      <button
                        onClick={() => setOpen(false)}
                        className="p-1 rounded-md hover:bg-gray-100"
                        aria-label="Close"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>

                    {/* Iframe with Microsoft Bookings / Outlook calendar */}
                    <div className="w-full h-[540px] sm:h-[560px]">
                      <iframe
                        src={bookingsUrl}
                        title="Bookings Calendar"
                        className="w-full h-full"
                        style={{ border: 0 }}
                        allow="clipboard-write; web-share; fullscreen;"
                        referrerPolicy="no-referrer-when-downgrade"
                        loading="lazy"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Link
                href="#contact"
                className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-sky-500 hover:bg-sky-500 hover:text-white transition"
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
              {/* Keep hero CTA unchanged per your request */}
              <Link
                href="#contact"
                className="inline-flex items-center rounded-lg bg-white px-5 py-2.5 text-sky-500 font-medium hover:bg-sky-500 hover:text-white transition"
              >
                Book a Live Demo
              </Link>
            </div>
          </div>

          {/* Right: Hero Image over video (stays behind the panel) */}
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
    </header>
  );
}
