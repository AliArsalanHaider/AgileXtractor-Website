// app/login/page.tsx
import type { Metadata } from "next";
import LoginClient from "./LoginClient";


export const metadata: Metadata = {
  title: "Log in",
  description: "Access your AgileXtract account.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <section id="login" className="min-h-screen flex items-center justify-center py-20">
      <LoginClient />
    </section>
  );
}

