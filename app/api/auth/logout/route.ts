// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";

/** Adjust these names to match what you actually set elsewhere */
const SESSION_COOKIES = [
  "auth_session",
  "access_token",
  "refresh_token",
  // next-auth style (if any):
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.csrf-token",
  // fallbacks you might have used:
  "agx_session",
  "agx_site_session",
  "session",
  "sid",
  "token",
  "auth",
  "jwt",
];

const HINT_COOKIES = [
  "email",
  "displayName",
  "accountId",
  "agx_email",
];

function baseDomainFromHost(host?: string | null) {
  if (!host) return undefined;
  const clean = host.replace(/^www\./, "").trim();
  // If you serve multiple subdomains, set AUTH_COOKIE_DOMAIN in env (e.g. ".agilemtech.ae")
  // to force a single cookie domain across shells.
  const fromEnv = process.env.AUTH_COOKIE_DOMAIN?.trim();
  if (fromEnv && fromEnv !== ".") return fromEnv.startsWith(".") ? fromEnv : `.${fromEnv}`;
  return `.${clean}`;
}

function setKillCookie(res: NextResponse, name: string, domain?: string) {
  // exact host
  res.cookies.set({
    name,
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    expires: new Date(0),
  });
  // apex domain (covers app. + www.)
  if (domain) {
    res.cookies.set({
      name,
      value: "",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      expires: new Date(0),
      domain,
    });
  }
}

export async function POST(request: NextRequest) {
  const res = NextResponse.json({ ok: true });

  // Compute domains to clear on
  const fwdHost = request.headers.get("x-forwarded-host");
  const host = fwdHost || request.headers.get("host") || "";
  const apex = baseDomainFromHost(host);

  // 1) Kill every incoming cookie name (best-effort)
  for (const c of request.cookies.getAll()) {
    setKillCookie(res, c.name, apex);
  }

  // 2) Kill known session + hint cookies explicitly (even if not present)
  for (const name of [...SESSION_COOKIES, ...HINT_COOKIES]) {
    setKillCookie(res, name, apex);
  }

  // 3) Strongly discourage any cache of this response
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

  // 4) Ask the browser to clear cookies & storage for this origin
  //    (Clears localStorage/sessionStorage/Cache Storage; helps both shells instantly)
  //    Works on HTTPS in modern browsers; keep it—it’s exactly what you want here.
  res.headers.set("Clear-Site-Data", `"cookies", "storage"`);

  return res;
}
