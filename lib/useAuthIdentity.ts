// app/lib/useAuthIdentity.ts
"use client";

import * as React from "react";
import { getIdentity } from "@/lib/identity";

export function useAuthIdentity() {
  const [identity, setIdentity] = React.useState(() => getIdentity());

  // Refresh identity when another tab logs out or we purge locally
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (["email", "userName", "accountId", "agx_usage_daily_v1", "agx_used_baseline_v1"].includes(e.key)) {
        setIdentity(getIdentity());
      }
    };
    const onAuthChanged = () => setIdentity(getIdentity());
    window.addEventListener("storage", onStorage);
    window.addEventListener("agx:auth-changed", onAuthChanged as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("agx:auth-changed", onAuthChanged as EventListener);
    };
  }, []);

  const isAuthed = !!(identity.email || identity.accountId);
  return { identity, isAuthed, refresh: () => setIdentity(getIdentity()) };
}
