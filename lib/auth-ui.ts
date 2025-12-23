"use client";

import * as React from "react";
import { getIdentity } from "@/lib/identity";

/** Mounted flag to avoid hydration mismatch */
export function useMounted() {
  const [m, setM] = React.useState(false);
  React.useEffect(() => setM(true), []);
  return m;
}

/**
 * Live auth state derived from cookies/localStorage via getIdentity(),
 * and kept in sync across tabs & programmatic logouts.
 */
export function useAuthState() {
  const [identity, setIdentity] = React.useState(() => getIdentity());
  const mounted = useMounted();

  React.useEffect(() => {
    if (!mounted) return;

    const update = () => setIdentity(getIdentity());

    // React to our custom events (fired by logout/login)
    const onAuthChanged = () => update();
    window.addEventListener("agx:auth-changed", onAuthChanged);

    // Cross-tab sync using storage ping
    const onStorage = (e: StorageEvent) => {
      if (e.key === "agx:auth-ping") update();
    };
    window.addEventListener("storage", onStorage);

    // Initial re-check on mount
    update();

    return () => {
      window.removeEventListener("agx:auth-changed", onAuthChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, [mounted]);

  const isAuthed = Boolean(identity.email || identity.accountId);
  return { isAuthed, identity, mounted };
}

/** Broadcast an auth change to all tabs */
export function broadcastAuthChange() {
  try {
    localStorage.setItem("agx:auth-ping", String(Date.now()));
  } catch {}
  window.dispatchEvent(new Event("agx:auth-changed"));
}
