// app/components/IdleGuard.tsx
"use client";

import * as React from "react";
import { logout, setAuthUser } from "@/lib/auth-client";

/**
 * Logs a user out after a period of inactivity.
 * - No reliance on /api/auth/ping; fully client-side safe.
 * - On timeout → calls server logout, clears local state, broadcasts, and hard reloads.
 */

const IDLE_MINUTES = Number(process.env.NEXT_PUBLIC_IDLE_MINUTES || 15); // e.g. 15
const IDLE_MS = IDLE_MINUTES * 60 * 1000;

export default function IdleGuard() {
  React.useEffect(() => {
    let t: number | null = null;

    const reset = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(async () => {
        try {
          // 1) Server logout (clear cookies)
          await logout(); // this also setAuthUser(null) & broadcasts via auth-client
        } catch {}
        try {
          // 2) Extra safety: ensure local UI state is cleared (if logout is overridden)
          setAuthUser(null);
        } catch {}
        // 3) Hard reload so all headers instantly reflect "logged out"
        window.location.replace("/");
      }, IDLE_MS);
    };

    // activity listeners
    const evs: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "focus",
    ];
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    // if tab comes back after being hidden, reset timer
    const onVisibility = () => {
      if (!document.hidden) reset();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // start
    reset();

    return () => {
      if (t) window.clearTimeout(t);
      evs.forEach((e) => window.removeEventListener(e, reset as any));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
