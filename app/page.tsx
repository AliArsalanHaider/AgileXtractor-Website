import Image from "next/image";
import Header from "./components/Header";
import ResultPage from "./components/result";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Intro from "./components/intro";
import AgileExtractSection from "./components/AgileXtraction";
import DocsWeverify from "./components/DocsWeverify";
import TestDriveUploader from "./components/TestDriveUploader";
import Pricing from "./components/Pricing";
import FAQs from "./components/FAQs";
import ContactSection from "@/app/components/ContactSection";


export default function Page() { 
  return (
    <main className=" bg-gray-200 w-full">
      <Header />
      <AgileExtractSection />
      <DocsWeverify />
      <TestDriveUploader />
      <Pricing />
      <FAQs />
      <ContactSection />
      <Footer />


    </main>
  );
}
