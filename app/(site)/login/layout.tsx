// app/(site)/login/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in — AgileXtract",
  description: "Access your AgileXtract dashboard.",
};

export default function LoginSegmentLayout({ children }: { children: React.ReactNode }) {
  // (site)/layout.tsx already provides Header/Main/Footer.
  return <>{children}</>;
}
