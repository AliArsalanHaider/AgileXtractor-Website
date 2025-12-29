// app/(site)/login/page.tsx
import { Suspense } from "react";
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
       <Suspense fallback={<div className="min-h-screen grid place-items-center text-sm text-slate-600">Loading…</div>}>
        <LoginClient />
       </Suspense>
    </section>
  );
}

