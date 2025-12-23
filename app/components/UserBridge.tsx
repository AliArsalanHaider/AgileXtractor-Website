"use client";

import { useEffect } from "react";

export default function UserBridge() {
  useEffect(() => {
    let gone = false;

    async function sync() {
      try {
        // Try NextAuth session first (works even if the (site) tree doesn't wrap a SessionProvider)
        const res = await fetch("/api/auth/session", { credentials: "include" });
        if (!res.ok) throw new Error("no session");
        const data = await res.json();
        const name =
          data?.user?.name ||
          (data?.user?.email ? String(data.user.email).split("@")[0] : "");

        if (!name) return; // nothing to set

        if (gone) return;
        // A) cookie (dash reads this)
        document.cookie = `displayName=${encodeURIComponent(name)}; path=/; max-age=31536000`;
        // B) window global (dash also checks this)
        (window as any).__USER__ = { name };
      } catch {
        // If you use a custom auth, you can fetch your own endpoint instead:
        // const res = await fetch("/api/me"); const { name } = await res.json(); ...
      }
    }

    sync();
    return () => { gone = true; };
  }, []);

  return null; // no UI
}
