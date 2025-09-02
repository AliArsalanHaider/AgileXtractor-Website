// app/components/Header.tsx
"use client";

import Image from "next/image";
import Link from "next/link";

export default function Header() {
  const CAP_D =
    "M0,40 a50,40 0 0 0 40,40 L 575,80 a75,160 0 0 1 40,40 a40,80 0 0 0 30,40 L 1160,160 a50,90 0 0 0 38,-40 a40,50 0 0 1 40,-40 L 1200,80 L 1200,240 L 0,240 Z";

  const ROBOT_SHIFT_X = 0;
  const ROBOT_SHIFT_Y = 0;
  const ROBOT_SCALE_X = 1.15;
  const ROBOT_SCALE_Y = 1.0;

  return (
    <header className="relative isolate overflow-hidden bg-white">
      {/* Background VIDEO */}
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

          <Link
            href="/book-demo"
            className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0B3658] hover:bg-white/90 transition"
          >
            Book a Live Demo
          </Link>
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
                href="/free-trial"
                className="inline-flex items-center rounded-lg bg-[#0B3658] px-5 py-2.5 text-white font-medium hover:bg-[#0a2e4f] transition"
              >
                Free Trial
              </Link>
              <Link
                href="/book-demo"
                className="inline-flex items-center rounded-lg bg-white px-5 py-2.5 text-[#0B3658] font-medium hover:bg-white/90 transition"
              >
                Book a Live Demo
              </Link>
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

      {/* === FULL-WIDTH, MIRRORED BOTTOM CURVE with robot2 INSIDE === */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[170px] md:h-[190px] lg:h-[210px]">
        {/* Flip vertically (bottom placement) AND horizontally (mirror like you asked) */}
        <div
          className="absolute inset-0 w-screen"
          style={{ transform: "scale(-1, -1)", transformOrigin: "bottom center" }}
        >
          {/* Base blue cap (stretched full screen) */}
          {/* <svg
            viewBox="0 0 1200 240"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
            aria-hidden="true"
          >
            <path d={CAP_D} fill="#0B3658" />
          </svg> */}

          {/* Robot2 clipped to the curved area */}
          {/* <svg
            viewBox="0 0 1200 240"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
            aria-hidden="true"
          > */}
            {/* <defs>
              <clipPath id="headerCapClip" clipPathUnits="userSpaceOnUse">
                <path d={CAP_D} />
              </clipPath>
            </defs> */}

            {/* <g
              clipPath="url(#headerCapClip)"
              transform={`translate(${ROBOT_SHIFT_X}, ${ROBOT_SHIFT_Y}) scale(${ROBOT_SCALE_X}, ${ROBOT_SCALE_Y})`}
            > */}
              <image
                href="/robot2.png"
                x="0"
                y="0"
                width="1600"
                height="240"
                preserveAspectRatio="xMidYMid slice"
              />
            {/* </g> */}
          {/* </svg> */}
        </div>
      </div>
    </header>
  );
}
