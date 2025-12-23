// app/pricing/page.tsx
import type { Metadata } from "next";
import Pricing from "@/app/components/Pricing";

export const metadata: Metadata = {
  title: "Pricing — AgileXtract",
  description:
    "Choose the right AgileXtract plan. Free, Basic, Premium, and Enterprise options with credits included. Save 25% with yearly billing.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "AgileXtract Pricing",
    description:
      "Free, Basic, Premium, and Enterprise plans with credits. Save 25% on yearly billing.",
    url: "/pricing",
    siteName: "AgileXtract",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgileXtract Pricing",
    description:
      "Free, Basic, Premium, and Enterprise plans with credits. Save 25% on yearly billing.",
  },
};

export default function PricingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "AgileXtract",
    offers: [
      { "@type": "Offer", priceCurrency: "AED", price: "0", category: "Free" },
      { "@type": "Offer", priceCurrency: "AED", price: "165", category: "Basic" },
      { "@type": "Offer", priceCurrency: "AED", price: "1100", category: "Premium" },
      { "@type": "Offer", priceCurrency: "AED", price: "0", category: "Enterprise", availability: "https://schema.org/PreOrder" },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Pricing />
    </>
  );
}
