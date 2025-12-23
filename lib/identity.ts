// /lib/identity.ts
import { normalizeEmail } from "./email-util";

/* ---------------------------------- Utils --------------------------------- */


/** Build the best cookie domain we can for cross-subdomain clearing. */
function getCookieDomain(): string | undefined {
  // Prefer explicit public env if you set it at build time
  const envDom =
    (typeof process !== "undefined" &&
      (process as any).env?.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN) ||
    (typeof process !== "undefined" &&
      (process as any).env?.NEXT_PUBLIC_BASE_DOMAIN);

  if (envDom) {
    const d = String(envDom).trim();
    return d.startsWith(".") ? d : `.${d.replace(/^www\./, "")}`;
  }

  // Fallback to current host (client-only)
  if (typeof location !== "undefined") {
    const host = location.hostname.replace(/^www\./, "");
    return `.${host}`;
  }

  return undefined;
}

type CookieOpts = {
  days?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
};

function setCookie(name: string, value: string, opts: CookieOpts = {}) {
  if (typeof document === "undefined") return;
  const {
    days = 30,
    path = "/",
    domain = getCookieDomain(),
    secure = true,
    sameSite = "lax",
  } = opts;

  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  let str = `${name}=${encodeURIComponent(value)}; Expires=${expires}; Path=${path}; SameSite=${sameSite}`;
  if (secure) str += "; Secure";
  // Write for current host
  document.cookie = str;
  // Also write for apex domain (so later we can clear reliably across subdomains)
  if (domain) {
    document.cookie = `${str}; Domain=${domain}`;
  }
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  const base = `${name}=; Max-Age=0; Path=/;`;
  // Current host
  document.cookie = base + " SameSite=Lax";
  // Apex domain
  const domain = getCookieDomain();
  if (domain) {
    document.cookie = `${base} Domain=${domain}; SameSite=Lax`;
  }
}

/* ------------------------------ Core Identity ------------------------------ */



export const PARAM_EMAIL = "email";
export const PARAM_ACCOUNT = "accountId";

export function readCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  return document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];
}

export function safeDecode(s?: string | null) {
  if (!s) return undefined;
  try { return decodeURIComponent(s); } catch { return s || undefined; }
}

export function getIdentity() {
  // 1) Cookies
  const cookieEmail =
    normalizeEmail(safeDecode(readCookie("agx_email")) || safeDecode(readCookie("email")));
  const cookieName =
    safeDecode(readCookie("displayName")) || safeDecode(readCookie("userName"));
  const cookieAccount = safeDecode(readCookie("accountId"));

  // 2) LocalStorage
  let lsEmail: string | undefined;
  let lsName: string | undefined;
  let lsAccount: string | undefined;
  if (typeof window !== "undefined") {
    try {
      lsEmail = normalizeEmail(localStorage.getItem("email") || undefined);
      lsName = localStorage.getItem("userName") || undefined;
      lsAccount = localStorage.getItem("accountId") || undefined;
    } catch {}
  }

  // 3) window.__USER__
  const winUser = (typeof window !== "undefined" ? (window as any).__USER__ : undefined) || {};
  const winEmail = normalizeEmail(winUser.email || undefined);
  const winName: string | undefined = winUser.name || undefined;
  const winAccount: string | undefined = winUser.accountId || undefined;

  const email = cookieEmail || lsEmail || winEmail;
  const accountId = cookieAccount || lsAccount || winAccount;
  const displayName =
    cookieName || lsName || winName || (email ? email.split("@")[0] : "User");

  return { email, accountId, displayName };
}

/* ----------------------------- Global Sign-out ----------------------------- */

/** Notify other tabs + listeners that auth changed. */
export function broadcastAuthLogout() {
  try {
    // storage event fires in other tabs
    localStorage.setItem("agx:logout", String(Date.now()));
  } catch {}
  // same-tab custom event
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("agx:auth-changed"));
  }
}

/** Remove all client-side identity hints (cookies + LS + __USER__). */
export function purgeClientIdentity() {
  try {
    ["agx_email", "email", "displayName", "userName", "accountId"].forEach(
      clearCookie
    );
    try {
      ["email", "userName", "accountId", "agx_usage_daily_v1", "agx_used_baseline_v1"].forEach(
        (k) => localStorage.removeItem(k)
      );
    } catch {}
    if (typeof window !== "undefined") {
      (window as any).__USER__ = undefined;
    }
  } catch {}
  broadcastAuthLogout();
}

/**
 * Call this from any UI "Log out" button.
 * - Tells the server to invalidate session
 * - Clears client identity
 * - Redirects to "/"
 */
export async function globalLogout(hardRedirect = true) {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {
    // ignore network errors; we'll still clear client hints
  }
  purgeClientIdentity();
  if (hardRedirect && typeof window !== "undefined") {
    window.location.replace("/");
  }
}

/**
 * Listen for cross-tab/logout events and re-run a callback (e.g., to re-read identity).
 * Returns an unsubscribe function.
 */
export function installAuthListeners(onChange: () => void) {
  const handler = () => onChange();
  const storage = (e: StorageEvent) => {
    if (e.key === "agx:logout") onChange();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("agx:auth-changed", handler as EventListener);
    window.addEventListener("storage", storage);
  }
  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("agx:auth-changed", handler as EventListener);
      window.removeEventListener("storage", storage);
    }
  };
}

/* --------------------------- Optional: set identity ------------------------- */
/** Use after login to persist identity across pages/subdomains. */
export function setClientIdentity(opts: {
  email?: string;
  displayName?: string;
  accountId?: string;
  days?: number;
}) {
  const { email, displayName, accountId, days = 30 } = opts || {};
  if (email) {
    setCookie("email", email, { days });
    setCookie("agx_email", email, { days });
    try {
      localStorage.setItem("email", email);
    } catch {}
  }
  if (displayName) {
    setCookie("displayName", displayName, { days });
    try {
      localStorage.setItem("userName", displayName);
    } catch {}
  }
  if (accountId) {
    setCookie("accountId", accountId, { days });
    try {
      localStorage.setItem("accountId", accountId);
    } catch {}
  }
  if (typeof window !== "undefined") {
    (window as any).__USER__ = {
      ...(window as any).__USER__,
      email: email ?? (window as any).__USER__?.email,
      name: displayName ?? (window as any).__USER__?.name,
      accountId: accountId ?? (window as any).__USER__?.accountId,
    };
  }
  // Inform any listeners to re-render headers/UI
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("agx:auth-changed"));
  }
}
