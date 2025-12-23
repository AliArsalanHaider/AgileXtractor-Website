// app/hooks/useIdleLogout.ts
"use client";

import * as React from "react";
import { globalLogout } from "@/lib/identity";

type Options = { idleMinutes?: number; pingMinutes?: number };

export function useIdleLogout(opts: Options = {}) {
  const idleMinutes = opts.idleMinutes ?? 15;
  const pingMinutes = opts.pingMinutes ?? 5;
  const idleMs = idleMinutes * 60_000;
  const pingMs = pingMinutes * 60_000;

  const idleTimerRef = React.useRef<number | null>(null);
  const pingTimerRef = React.useRef<number | null>(null);
  const activeRef = React.useRef<boolean>(true);

  const clearIdle = React.useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const startIdle = React.useCallback(() => {
    clearIdle();
    idleTimerRef.current = window.setTimeout(async () => {
      await globalLogout(true);
    }, idleMs);
  }, [clearIdle, idleMs]);

  const resetIdle = React.useCallback(() => {
    activeRef.current = true;
    startIdle();
  }, [startIdle]);

  const handleActivity = React.useCallback(() => {
    resetIdle();
  }, [resetIdle]);

  const clearPing = React.useCallback(() => {
    if (pingTimerRef.current) {
      window.clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }, []);

  const startPing = React.useCallback(() => {
    clearPing();
    pingTimerRef.current = window.setInterval(async () => {
      if (!activeRef.current) return;
      try {
        const res = await fetch("/api/auth/ping", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          await globalLogout(true);
        }
      } catch {
        // ignore transient network errors
      }
    }, pingMs);
  }, [clearPing, pingMs]);

  const onVisibility = React.useCallback(() => {
    activeRef.current = document.visibilityState !== "hidden";
    if (activeRef.current) resetIdle();
  }, [resetIdle]);

  React.useEffect(() => {
    const events: (keyof DocumentEventMap | keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];
    events.forEach((ev) =>
      window.addEventListener(ev as any, handleActivity, { passive: true })
    );
    document.addEventListener("visibilitychange", onVisibility);

    resetIdle();
    startPing();

    return () => {
      events.forEach((ev) =>
        window.removeEventListener(ev as any, handleActivity as any)
      );
      document.removeEventListener("visibilitychange", onVisibility);
      clearIdle();
      clearPing();
    };
  }, [handleActivity, onVisibility, resetIdle, startPing, clearIdle, clearPing]);
}
