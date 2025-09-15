// app/components/DocsWeverify.tsx
"use client";

import Image from "next/image";

type Doc = { title: string; body: string; img: string };

const DOCS: Doc[] = [
  {
    title: "Emirates ID (National ID Card)",
    body:
      "The Emirates ID is the official identification card issued by the UAE government to citizens and residents. It contains personal details such as name, nationality, date of birth, ID number, and more. AgileXtract accurately extracts text from image capturing all key fields from the Emirates ID — including both front and back sides — to help businesses automate identity verification, onboarding, and compliance processes with ease.  ",
    img: "/emirates-id-sample%205.png",
  },
  {
    title: "Driving License",
    body:
      "The UAE Driving License serves as both a legal permit to drive and a widely accepted form of identification. It includes critical information such as license number, name, date of birth, issue and expiry dates, categories, and place of issue. AgileXtract extracts all key fields from UAE driving license and helps you translate image text with high accuracy, enabling seamless data entry for insurance claims, rentals, identity verification, and more. ",
    img: "/driving%20-license.png",
  },
  {
    title: "Vehicle License",
    body:
      "The Vehicle License, commonly known as Mulkiya, is the official registration document for vehicles in the UAE. It contains important details such as vehicle owner information, registration number, chassis number, vehicle type, plate number, and expiry date. AgileXtract quickly extracts text from image including all relevant data from the Mulkiya, helping businesses in insurance, transportation, and leasing streamline their workflows and reduce manual entry errors. ",
    img: "/vehical-license.png",
  },
  {
    title: "Passing Certificate",
    body:
      "The Passing Certificate is issued by the UAE traffic authorities to confirm that a vehicle has passed the mandatory technical inspection. It includes key details such as vehicle information, test results, inspection date, certificate number, and validity period. AgileXtract extracts structured data from passing certificates with speed and precision — supporting faster processing for vehicle registration, insurance approvals, and fleet compliance. ",
    img: "/passing-aper.png",
  },
  {
    title: "Trade License",
    body:
      "The Trade License is an official document issued by UAE economic departments, authorizing businesses to operate legally within the region. It includes crucial information such as license number, company name, legal type, activities permitted, issue and expiry dates, and the registered address. AgileXtract accurately captures all key fields from trade licenses, enabling faster onboarding, compliance checks, and automation of business verification processes. ",
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
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-16 pt-8 sm:pt-16 pb-0">
        <h2 className="text-center text-3xl sm:text-5xl lg:text-6xl font-semibold text-[#2BAEFF]">
          Identity Documents We Verify
        </h2>

        {/* CONSISTENT VERTICAL SPACING ACROSS ALL BREAKPOINTS */}
        <div className="mt-10 sm:mt-12 space-y-16 md:space-y-20 lg:space-y-0 xl:space-y-0 2xl:space-y-32">
          {DOCS.map((doc, idx) => {
            const id = SECTION_IDS[doc.title] ?? `doc-${idx + 1}`;
            return (
              <div
                key={idx}
                id={id}
                className="scroll-mt-28 md:scroll-mt-36"
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

  // Responsive inner sizing (friendly up to 2xl/large desktops)
  const BOX_W = "w-full max-w-[660px] 2xl:max-w-[760px]";
  const IMG_H =
    "h-[260px] sm:h-[360px] md:h-[420px] lg:h-[480px] xl:h-[540px] 2xl:h-[600px]";

  const Text = (
    <div className={`${BOX_W} pt-0 sm:pt-0 md:pt-0`}>
      <h3 className="text-lg sm:text-2xl md:text-3xl font-semibold text-gray-900">
        {doc.title}
      </h3>
      <p className="mt-4 sm:mt-6 md:mt-8 text-base sm:text-lg md:text-xl font-medium text-gray-800 leading-relaxed">
        {doc.body}
      </p>

      {/* Learn More button */}
      <div className="mt-6">
        <a
          href="#contact" // change to a specific route if needed
          className="inline-block rounded-md px-4 py-2 font-medium
                     border border-[#2BAEFF]
                     bg-[#2BAEFF] text-white
                     hover:bg-white hover:text-[#2BAEFF]
                     transition-colors duration-200"
        >
          Learn More
        </a>
      </div>
    </div>
  );

  const Img = (
    <div className={`relative ${BOX_W} ${IMG_H}`}>
      <Image
        src={doc.img}
        alt={doc.title}
        fill
        className="object-contain"
        sizes="(max-width: 768px) 92vw, (max-width: 1280px) 46vw, (max-width: 1536px) 42vw, 780px"
        priority
      />
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-10 lg:gap-12 xl:gap-16 2xl:gap-20">
      {textLeft ? (
        <>
          <div className="flex justify-start lg:pr-6 xl:pr-8">{Text}</div>
          <div className="flex justify-end lg:pl-6 xl:pl-8">{Img}</div>
        </>
      ) : (
        <>
          <div className="flex justify-start lg:pr-6 xl:pr-8">{Img}</div>
          <div className="flex justify-end lg:pl-6 xl:pl-8">{Text}</div>
        </>
      )}
    </div>
  );
}
