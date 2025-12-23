// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-client";
import IdleGuard from "./components/IdleGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgileXtract",
  description: "No more manual entries",
  icons: {
    icon: "/x.png",
    shortcut: "/x.png",
    apple: "/x.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Apply font CSS variables + antialiasing */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* ⬇️ Auth context now wraps the whole app */}
        <AuthProvider>
          {/* Idle logout applies globally (client component is fine here) */}
          <IdleGuard />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
