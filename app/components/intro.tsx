"use client";

import React from "react";
import { FileText, Scan, ClipboardCheck, FileOutput } from "lucide-react";

export default function Intro() {
  return (
    <section className="w-full bg-white py-12 px-4 md:px-8">
      {/* Title */}
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-[#2BAEFF]">
          AgileXtract
        </h1>
        <p className="mt-4 text-gray-700 text-base md:text-lg leading-relaxed">
          AgileXtract is a smart text extractor that processes the key
          information from the UAE Government issued documents. It includes the
          following document categories:
        </p>
      </div>

      {/* Categories */}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {[
          "Emirates ID",
          "Driving Licenses",
          "Vehicle Licenses",
          "Trade Licenses",
          "Passing Certificates",
        ].map((item, index) => (
          <span
            key={index}
            className="px-4 py-2 bg-gray-100 border rounded-lg shadow-sm text-gray-700 text-sm md:text-base hover:bg-gray-200 transition"
          >
            {item}
          </span>
        ))}
      </div>

      {/* Section Title */}
      <div className="mt-12 text-center">
        <h2 className="text-2xl md:text-3xl font-semibold text-[#2BAEFF]">
          How Our Solution Works
        </h2>
      </div>

      {/* Steps */}
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
        {/* Step 1 */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-yellow-100 shadow-md">
            <FileText className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="mt-3 text-gray-700 text-sm md:text-base font-medium">
            Upload Document
          </p>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-orange-100 shadow-md">
            <Scan className="w-8 h-8 text-orange-600" />
          </div>
          <p className="mt-3 text-gray-700 text-sm md:text-base font-medium">
            Document Detection
          </p>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-purple-100 shadow-md">
            <ClipboardCheck className="w-8 h-8 text-blue-600" />
          </div>
          <p className="mt-3 text-gray-700 text-sm md:text-base font-medium">
            Key Field Extraction
          </p>
        </div>

        {/* Step 4 */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-blue-100 shadow-md">
            <FileOutput className="w-8 h-8 text-blue-600" />
          </div>
          <p className="mt-3 text-gray-700 text-sm md:text-base font-medium">
            Structured Output
          </p>
        </div>
      </div>
    </section>
  );
}
