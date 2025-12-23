// app/components/ClientOnly.tsx
"use client";
import * as React from "react";

/**
 * Renders children only after the component has mounted on the client.
 * This avoids SSR/CSR discrepancies for anything that touches window, time, localStorage, etc.
 */
export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}
