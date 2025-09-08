// app/components/FAQs.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Minus, X } from "lucide-react";

type FaqItem = {
  q: string;
  a: string;
};

const FAQS: FaqItem[] = [
  {
    q: "What documents does AgileXtract support?",
    a: "AgileXtract currently supports Emirates ID, Driving License, Vehicle License (Mulkiya), Passing Certificate, and Trade License issued by the UAE government.",
  },
  {
    q: "How accurate is the text extraction?",
    a: "Our models are optimized for UAE documents and achieve high field-level precision. We also include confidence scores to help you route manual review when needed.",
  },
  {
    q: "How fast is the extraction process?",
    a: "Most extractions complete in seconds. Bulk batches are processed in parallel so large jobs finish quickly.",
  },
  {
    q: "Do I need technical expertise to use AgileXtract?",
    a: "No. You can upload documents via the web UI. Developers can also use our API for full automation.",
  },
  {
    q: "How is my data handled?",
    a: "We use encrypted transit & storage, role-based access controls, and configurable data retention aligned to your compliance requirements.",
  },
];

export default function FAQs() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  const toggle = (idx: number) =>
    setOpenIndex((cur) => (cur === idx ? -1 : idx));

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-6 sm:px-8 py-12 sm:py-16">
        {/* Eyebrow + Title */}
        <p className="text-center text-xs tracking-[0.2em] text-gray-500">
          QUESTIONS &amp; ANSWERS
        </p>
        <h2 className="mt-2 text-center text-3xl sm:text-5xl font-bold">
          <span className="text-sky-500">Frequently Asked Questions</span>
        </h2>

        {/* Main grid */}
        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:items-start">
          {/* Left: illustration (replace src with your asset if different) */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-[420px] aspect-square">
              <Image
                src="/Group 39928.png" // put your image into /public as faq-illustration.png
                alt="FAQ Illustration"
                fill
                className="rounded-2xl object-cover"
                sizes="(max-width: 1024px) 90vw, 420px"
                priority
              />
            </div>
          </div>

          {/* Right: Accordion */}
          <div className="w-full">
            {FAQS.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={item.q}
                  className="border-b border-gray-200 first:border-t rounded-none"
                >
                  <button
                    onClick={() => toggle(idx)}
                    className="w-full flex items-center justify-between py-4 text-left"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${idx}`}
                  >
                    <span
                      className={`text-[15px] sm:text-base font-medium ${
                        isOpen ? "text-sky-600" : "text-gray-900"
                      }`}
                    >
                      {item.q}
                    </span>
                    {isOpen ? (
                      <Minus className="h-5 w-5 text-sky-600" />
                    ) : (
                      <Plus className="h-5 w-5 text-gray-500" />
                    )}
                  </button>

                  {/* Answer */}
                  {isOpen && (
                    <div
                      id={`faq-panel-${idx}`}
                      className="pb-4 text-sm text-gray-600 leading-relaxed"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="pr-8">{item.a}</p>
                        <button
                          aria-label="Close"
                          className="shrink-0 rounded-md p-1.5 hover:bg-gray-100"
                          onClick={() => setOpenIndex(-1)}
                        >
                          <X className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>


        {/* Subscribe row
        <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:items-center">
          <div>
            <h3 className="text-sky-500 font-semibold">
              Stay up-to-date with the world of document processing
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Subscribe to get product updates, release notes, and ideas that keep you informed on
              identity verification, extraction accuracy, and modern document AI workflows.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              // handle subscribe
            }}
            className="flex gap-3"
          >
            <input
              type="email"
              required
              placeholder="Enter your email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
            />
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-white font-medium hover:bg-sky-600"
            >
              Subscribe
            </button>
          </form>
        </div> */}

        
      </div>
    </section>
  );
}
