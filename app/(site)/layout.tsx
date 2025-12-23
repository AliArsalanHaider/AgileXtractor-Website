// app/(site)/layout.tsx  (Server Component)
import type { ReactNode } from "react";
import Header from "@/app/components/Header"; 
import Footer from "@/app/components/Footer";

export default function SiteLayout({ children }: { children: ReactNode }) {
  // No hooks here in the server layout
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
