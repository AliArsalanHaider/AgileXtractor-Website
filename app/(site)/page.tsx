// app/page.tsx
import AgileExtractSection from "@/app/components/AgileXtraction";
import DocsWeverify from "@/app/components/DocsWeverify";
import TestDriveUploader from "@/app/components/TestDriveUploader";
import Pricing from "@/app/components/Pricing";
import FAQs from "@/app/components/FAQs";
import ContactSection from "@/app/components/ContactSection";

export default function Page() {
  return (
    <main className="bg-gray-200 w-full">
      <AgileExtractSection />
      <DocsWeverify />
      <TestDriveUploader />
      <Pricing />
      <FAQs />
      <ContactSection />
    </main>
  );
}
