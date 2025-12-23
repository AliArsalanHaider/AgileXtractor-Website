// /lib/auth-client.ts
"use client";

import * as React from "react";

/** Shape of an authenticated user */
export type AuthUser = {
  email: string;
  firstName?: string;
  name?: string;
  accountId?: string;
  [key: string]: any;
};

type Ctx = {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void; // allow null to represent "signed out"
};

const AuthCtx = React.createContext<Ctx | undefined>(undefined);

// ----- Storage helpers -----
const STORAGE_KEY = "agx_auth_user";

function readUserFromStorage(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.email) return parsed as AuthUser;
  } catch {}
  return null;
}

function writeUserToStorage(u: AuthUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// ----- Provider -----
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = React.useState<AuthUser | null>(null);

  // Hydrate once
  React.useEffect(() => {
    setUserState(readUserFromStorage());
  }, []);

  // Keep context in sync with changes triggered elsewhere (other components/tabs)
  React.useEffect(() => {
    const sync = () => setUserState(readUserFromStorage());
    window.addEventListener("storage", sync);           // fires on other tabs
    window.addEventListener("agx:auth-changed", sync);  // fires on same tab
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("agx:auth-changed", sync);
    };
  }, []);

  const setUser = React.useCallback((u: AuthUser | null) => {
    setUserState(u);
    writeUserToStorage(u);
    try {
      window.dispatchEvent(new Event("agx:auth-changed")); // notify this tab
    } catch {}
  }, []);

  const value = React.useMemo(() => ({ user, setUser }), [user, setUser]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

// ----- Hooks & helpers -----
export function useAuthUser() {
  const ctx = React.useContext(AuthCtx);
  if (!ctx) throw new Error("useAuthUser must be used within <AuthProvider>");
  return { user: ctx.user, setUser: ctx.setUser };
}

/** Programmatic setter that also broadcasts to other tabs */
export function setAuthUser(u: AuthUser | null) {
  writeUserToStorage(u);
  try {
    // Trigger storage event for other tabs by toggling the key explicitly
    // (Some browsers only fire 'storage' on other tabs)
    localStorage.setItem(`${STORAGE_KEY}__ping`, String(Date.now()));
    localStorage.removeItem(`${STORAGE_KEY}__ping`);
  } catch {}
  try {
    window.dispatchEvent(new Event("agx:auth-changed")); // same-tab listeners
  } catch {}
}

/** Clear helper */
export function clearAuthUser() {
  setAuthUser(null);
}

/** Server logout + local clear */
export async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {}
  setAuthUser(null);
}
