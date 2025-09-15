// app/components/TestDriveUploader.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

type Props = {
  onSampleSelect?: (sample: string) => void;
};

const SAMPLE_LABELS = [
  "Emirates ID (National ID Card)",
  "Driving License",
  "Vehicle License",
  "Passing Certificate",
  "Trade License",
];

// Lazy-load your Result component from app/components/result.tsx
const ResultView = dynamic(() => import("./result"), { ssr: false });

export default function TestDriveUploader({ onSampleSelect }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [animateIn, setAnimateIn] = useState(false); // for smooth fade/scale in
  const [isFullscreen, setIsFullscreen] = useState(false); // NEW: hide close when fullscreen

  const openModal = () => {
    setShowModal(true);
  };
  const closeModal = () => {
    setAnimateIn(false);
    // small delay to let fade-out finish
    setTimeout(() => setShowModal(false), 180);
  };

  // Lock page scroll & close on Esc while modal is open
  useEffect(() => {
    if (!showModal) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);

    // trigger enter animation next frame
    const id = requestAnimationFrame(() => setAnimateIn(true));

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(id);
    };
  }, [showModal]);

  // NEW: Listen for real fullscreen changes to hide/show the close button
  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  // OPTIONAL: If your inner viewer uses a custom "immersive" overlay instead of the
  // Fullscreen API, you can dispatch events to control visibility:
  // window.dispatchEvent(new CustomEvent("agx:immersive", { detail: true|false }))
  useEffect(() => {
    const onImmersive = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === "boolean") setIsFullscreen(detail);
    };
    window.addEventListener("agx:immersive", onImmersive as EventListener);
    return () => window.removeEventListener("agx:immersive", onImmersive as EventListener);
  }, []);

  return (
    // 🔗 Anchor target for in-page links like href="#test-drive"
    <section id="test-drive" className="bg-white scroll-mt-2">
      <div className="mx-auto max-w-6xl px-8 py-8 sm:py-6">
        {/* Heading */}
        <h2 className="text-center text-3xl sm:text-6xl font-bold text-[#2BAEFF] mx:px-8 py-10">
          Test-drive AgileXtract’s Document AI
        </h2>
        <p className="mt-3 text-xl sm:text-1xl text-center text-gray-700">
          Upload your own set of documents or use our samples to see how AgileXtract’s
          Document AI works.
        </p>
        <p className="mt-1 text-center text-gray-400 text-sm">
          [Supports up to 5 pages &amp; 35MB]
        </p>

        {/* Card (button only, no upload logic) */}
        <div className="mt-8 rounded-[32px] bg-white shadow-2xl ring-1 ring-black/5 px-12 pt-10 pb-12">
          <div
            className={[
              "rounded-3xl border-4 border-dashed border-gray-400",
              "h-64 sm:h-72 md:h-80 flex items-center justify-center text-center",
            ].join(" ")}
          >
            <div>
              <button
                type="button"
                onClick={openModal}
                className="inline-flex items-center gap-2 text-[#2BAEFF] text-2xl font-semibold hover:underline focus:outline-none"
              >
                Upload Now
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="inline-block"
                  aria-hidden="true"
                >
                  <path
                    d="M12 16V4m0 0l-4 4m4-4l4 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Samples row */}
          <div className="px-6 pb-6">
            <p className="mt-4 text-center text-gray-800 font-bold text-sm">
              Don’t have a document? Try one of our samples.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {SAMPLE_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onSampleSelect?.(label)}
                  className="rounded-xl bg-white px-4 py-2 text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-sky-50 hover:text-sky-700"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Fullscreen transparent popup (Result component) ===== */}
      {showModal && (
        <div
          className={[
            "fixed inset-0 z-[100] agx-modal-root", // NEW class for CSS :has fallback
            "transition-opacity duration-200 ease-out",
            animateIn ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" />

          {/* Close button (top-right of viewport) — hidden when fullscreen/immersive */}
          {!isFullscreen && (
            <button
              onClick={closeModal}
              aria-label="Close"
              title="Close"
              className="absolute top-3 right-3 z-[110] rounded-full bg-white/90 p-2 md:p-2.5 text-gray-800 shadow hover:bg-white agx-modal-close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}

          {/* Content wrapper centered with equal top/bottom space */}
          <div
            className={[
              "fixed inset-0 z-[105] flex items-center justify-center p-4 sm:p-6",
              "transform transition-all duration-200 ease-out",
              animateIn ? "opacity-100 scale-100" : "opacity-0 scale-95",
            ].join(" ")}
          >
            {/* Modal container (size-limited, scrollable if needed) */}
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-6xl max-h[90vh] overflow-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
            >
              <ResultView />
            </div>
          </div>

          {/* Global CSS fallback: if any descendant is :fullscreen, hide the close */}
          <style jsx global>{`
            .agx-modal-root:has(:fullscreen) .agx-modal-close {
              display: none !important;
            }
          `}</style>
        </div>
      )}
    </section>
  );
}
