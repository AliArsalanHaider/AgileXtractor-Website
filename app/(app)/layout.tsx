// app/(app)/layout.tsx
import type { ReactNode } from "react";
import VerifyEmailBanner from "@/app/components/VerifyEmailBanner";

export const metadata = {
  title: "AgileXtract — App",
  description: "User dashboard and app area",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-slate-50">
    {children}</div>;

}
