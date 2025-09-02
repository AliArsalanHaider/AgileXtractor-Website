// app/components/DocsWeverify.tsx
"use client";

import Image from "next/image";

type Doc = { title: string; body: string; img: string };

const DOCS: Doc[] = [
  {
    title: "Emirates ID (National ID Card)",
    body:
      "The Emirates ID is the official identification issued by the UAE government. Our engine detects and extracts key fields such as ID Number, Full Name, Nationality and Date of Birth with high accuracy. It supports Arabic/English text and handles real-world image noise.",
    img: "/emirates-id-sample%205.png",
  },
  {
    title: "Driving License",
    body:
      "The UAE Driving License contains vital legal details: License Number, Full Name, Date of Birth, Issue and Expiry dates, Place of Issue and Nationality. AgileXtract reads both Arabic and English fields reliably—even when scans are low-contrast.",
    img: "/driving%20-license.png",
  },
  {
    title: "Vehicle License",
    body:
      "The Vehicle License (Mulkiya) is the official registration document for a vehicle. We capture Plate Number, Chassis Number, Engine details, Category/Class and Owner info. Built-in validation reduces manual review and speeds up onboarding.",
    img: "/vehical-license.png",
  },
  {
    title: "Passing Certificate",
    body:
      "A Passing Certificate verifies that a vehicle satisfies technical & safety standards. Our parser extracts Status, Certificate Number, Inspection date/time and results summary so teams can automate compliance workflows instantly.",
    img: "/passing-aper.png",
  },
  {
    title: "Trade License",
    body:
      "The Trade License identifies a business: Company Name, License Number, Issue/Expiry dates, Legal Form and permitted activities. AgileXtract normalizes fields for downstream systems (CRMs/ERPs) to cut errors and manual data entry.",
    img: "/trade-license.png",
  },
];

// Map titles -> section IDs
const SECTION_IDS: Record<string, string> = {
  "Emirates ID (National ID Card)": "EID",
  "Driving License": "DL",
  "Vehicle License": "mulkiya",
  "Trade License": "TL",
  "Passing Certificate": "pass",
};

export default function DocsWeverify() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-8xl px-10 pt-8 sm:pt-16 pb-0 sm:pb-0">
        <h2 className="text-center text-4xl sm:text-6xl font-semibold text-[#2BAEFF]">
          Identity Documents We Verify
        </h2>

        <div className="mt-10 mb-[-120px] sm:mb-[-200px]">
          {DOCS.map((doc, idx) => {
            const id = SECTION_IDS[doc.title] ?? `doc-${idx + 1}`;
            return (
              <div
                key={idx}
                id={id}
                className={[
                  // keep your existing overlap spacing
                  idx === 0 ? "" : "-mt-16 sm:-mt-20 md:-mt-24 lg:-mt-28 xl:-mt-32",
                  idx === DOCS.length - 1 ? "-mb-24 sm:-mb-32 md:-mb-40" : "",
                  // smooth anchor offset for fixed headers
                  "scroll-mt-28 md:scroll-mt-36",
                ].join(" ")}
              >
                <Row doc={doc} index={idx} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Row({ doc, index }: { doc: Doc; index: number }) {
  // 1,3,5 => text|image ; 2,4 => image|text
  const textLeft = index % 2 === 0;

  // Consistent inner dimensions so everything lines up
  const BOX_W = "max-w-[660px]";
  const IMG_H = "h-[360px] sm:h-[540px]"; // uniform image height

  const Text = (
    <div className={`w-full ${BOX_W} pt-12 sm:pt-12`}>  {/* slight top offset */}
      <h3 className="text-xl sm:text-3xl font-semibold text-gray-900">
        {doc.title}
      </h3>
      {/* 14px + slightly bold */}
      <p className="mt-6 sm:mt-8 sm:text-xl font-medium text-gray-800 leading-relaxed">
        {doc.body}
      </p>
    </div>
  );

  const Img = (
    <div className={`relative w-full ${BOX_W} ${IMG_H}`}>
      <Image
        src={doc.img}
        alt={doc.title}
        fill
        className="object-contain"
        sizes="(max-width: 1024px) 90vw, 760px"
        priority
      />
    </div>
  );

  return (
    <div className="grid items-start gap-3 md:grid-cols-2">
      {textLeft ? (
        <>
          <div className="flex justify-start">{Text}</div>
          <div className="flex justify-end">{Img}</div>
        </>
      ) : (
        <>
          <div className="flex justify-start">{Img}</div>
          <div className="flex justify-end">{Text}</div>
        </>
      )}
    </div>
  );
}
