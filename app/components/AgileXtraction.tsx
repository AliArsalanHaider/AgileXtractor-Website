// app/components/AgileXtraction.tsx
"use client";

import Image from "next/image";
import { useState } from "react";

const TAGS = [
  "Emirates ID",
  "Driving Licenses",
  "Vehicle Licenses",
  "Trade Licenses",
  "Passing Certificates",
];

// Map tag labels -> section IDs from DocsWeverify
const TAG_TO_ID: Record<string, string> = {
  "Emirates ID": "EID",
  "Driving Licenses": "DL",
  "Vehicle Licenses": "mulkiya",
  "Trade Licenses": "TL",
  "Passing Certificates": "pass",
};

export default function AgileXtraction() {
  const [activeTag, setActiveTag] = useState("Emirates ID");

  function handleTagClick(t: string) {
    setActiveTag(t);
    const anchor = TAG_TO_ID[t];
    if (anchor) {
      const el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.location.hash = `#${anchor}`; // fallback
    }
  }

  return (
    <section className="relative bg-white">
      {/* ===== AgileXtract: Title + Bullets + Preview + Tags ===== */}
      <div className="mx-auto max-w-7xl px-6 md:px-14 py-6 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-6 lg:gap-14">
        {/* Copy (left) */}
        <div className="lg:pr-6">
          {/* Heading with inline X image */}
          <h2
              className="
                -mt-3 sm:-mt-4 lg:-mt-10   /* move up a bit */
                mb-4                      /* slightly less space below (was mb-6) */
                text-4xl sm:text-6xl font-semibold tracking-tight text-sky-400
              "
            >
              Agile
              <span
                className="relative inline-block align-middle h-[1em] w-[1em] mx-[0.0em] bottom-[0.10em]"
                aria-label="X"
              >
                <Image
                  src="/X.png"
                  alt="X"
                  fill
                  className="object-contain"
                  sizes="5em"
                  priority
                />
              </span>
              tract
            </h2>


          {/* Bullets (left-aligned) */}
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
            Instantly capture data from UAE government-issued documents with built-in Arabic–English support.
          </h3>
          <p className="mt-4 sm:text-xl text-gray-700">
            AgileXtract extracts fields from documents and images into clean, structured data in seconds,
            eliminating manual entry, data errors, and reducing processing time. Designed for speed, accuracy,
            and security, it helps businesses streamline operations and improve customer onboarding.
            Our key features are:
          </p>

          <ul className="mt-6 space-y-4 text-gray-700 text-left">
            <li className="flex gap-3 sm:text-xl">
              <span className="mt-2.5 h-2 w-2 rounded-full bg-sky-600 shrink-0"></span>
              <span>Arabic text extraction from image / document</span>
            </li>
            <li className="flex gap-3 sm:text-xl">
              <span className="mt-2.5 h-2 w-2 rounded-full bg-sky-600 shrink-0"></span>
              <span>English text extraction from image / document</span>
            </li>
            <li className="flex gap-3 sm:text-xl">
              <span className="mt-2.5 h-2 w-2 rounded-full bg-sky-600 shrink-0"></span>
              <span>Arabic to English Translation</span>
            </li>
          </ul>
        </div>

        {/* Preview Image (right) */}
        <div className="lg:pl-14">
          <div className="relative rounded-2xl overflow-hidden lg:origin-right lg:scale-[1.25]">
            <Image
              src="/emirates-id-extracted-data.png"
              alt="Emirates ID extracted fields preview"
              width={986}
              height={434}
              priority
              className="h-auto w-full"
              sizes="(max-width: 1024px) 100vw, 44rem"
            />
          </div>
        </div>

      </div>



       {/* Tags row (full width across section) */}
        <div className="mt-14 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTagClick(t)}
              className={[
                "rounded-xl border px-4 py-2 text-sm transition text-center w-full",
                activeTag === t
                  ? "bg-white text-sky-500 border-sky-500 hover:bg-sky-500 hover:text-white" // selected
                  : "bg-white text-sky-500 border-sky-500 hover:bg-sky-500 hover:text-white", // default + hover
              ].join(" ")}
              aria-pressed={activeTag === t}
              aria-controls={TAG_TO_ID[t] ?? undefined}
            >
              {t}
            </button>
          ))}
        </div>


        {/* Blurb */}
        <p className="mt-10 max-w-3xl mx-auto text-xl text-center text-gray-700">
          It is a fast, reliable and secure solution that streamlines operations
          and reduces manual labour for business across multiple industries.
        </p>
      </div>

      {/* ===== How Our Solution Works (4 cards) ===== */}
      <div className="mx-auto max-w-6xl px-8 pt-2 pb-14">
        <h3 className="text-center text-3xl sm:text-5xl font-semibold text-sky-500">
          How Our Solution Works
        </h3>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card imgSrc="/folder.png" alt="Upload Document" title="Upload Document" />
          <Card imgSrc="/Group%2039895.png" alt="Document Detection" title="Document Detection" />
          <Card imgSrc="/Group%2039896.png" alt="Key Field Extraction" title="Key Field Extraction" />
          <Card imgSrc="/file%201.png" alt="Structured Output" title="Structured Output" />
        </div>
      </div>

      
        <div className="relative h-72">
          {/* Background image */}
          <Image
            src="/frame02.png"
            alt="AgileXtract background"
            fill
            className="object-cover"
            priority
          />

          {/* (Optional) subtle overlay for text readability — remove if not needed */}
          <div className="absolute inset-0 bg-grey/20" />

          {/* Content */}
          <div className="relative mx-auto max-w-6xl px-8 h-full">
            <div className="grid h-full lg:grid-cols-[4fr_2fr]">
              {/* LEFT: Text (kept same) */}
              <div className="flex h-full items-center">
                <div className="text-white">
                  <h4 className="text-3xl sm:text-4xl lg:text-3xl font-bold leading-tight">
                    Extract Fields in under 5 Seconds
                  </h4>
                  <p className="mt-3 text-white/90 text-base leading-relaxed w-full pr-8">
                    Validate your documents with AgileXtract’s smart text extractor that
                    gets all the data accurately and within seconds. Test AgileXtract free
                    and process your first document instantly!
                  </p>

                  <a
                    href="#test-drive"
                    className="group relative mt-5 inline-flex items-center justify-center rounded-xl
                              bg-white px-6 py-3 text-[#2BAEFF] font-medium shadow-sm transition
                              hover:bg-[#2BAEFF] hover:text-white
                              focus:outline-none focus-visible:ring-4 focus-visible:ring-white/80"
                  >
                    <span className="relative z-10">Free Trial</span>

                    {/* White layer that shows on hover regardless of hovering text or gap */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-xl border-2 border-white
                                opacity-0 transition duration-300 group-hover:opacity-100"
                    />
                  </a>

                </div>
              </div>

              {/* RIGHT: (Removed the old image) — keep empty to preserve spacing on lg */}
              <div className="hidden lg:block" />
            </div>
          </div>
        </div>
    </section>
  );
}

/* ---------- Small card component ---------- */
function Card({
  imgSrc,
  alt,
  title,
}: {
  imgSrc: string;
  alt: string;
  title: string;
}) {
  return (
    <div className="rounded-3xl bg-gray-50 shadow-sm ring-1 ring-gray-100 px-6 py-8 text-center">
      <div className="mx-auto flex h-40 w-40 items-center justify-center">
        <Image
          src={imgSrc}
          alt={alt}
          width={160}
          height={160}
          className="h-28 w-28 object-contain"
          priority
        />
      </div>
      <p className="mt-5 text-gray-800 font-medium">{title}</p>
    </div>
  );
}
