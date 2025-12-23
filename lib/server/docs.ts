// lib/server/docs.ts
import { createHash } from "crypto";
import fs from "fs";
import path from "path";

export const STORAGE_ROOT = process.env.DOCS_ROOT || "/mnt/docs";

export function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

export function userRoot(accountId?: string, email?: string) {
  const key = accountId || email || "anon";
  const dir = path.join(STORAGE_ROOT, key);
  ensureDir(dir);
  return dir;
}

export function sha1(buf: Buffer | string) {
  const h = createHash("sha1");
  h.update(buf);
  return h.digest("hex");
}

export function byIdPath(root: string, id: string) {
  // you can map from DB instead; this is a fallback if path is stored as <root>/<id>-*
  const files = fs.readdirSync(root).filter(f => f.startsWith(id + "-"));
  if (!files.length) return null;
  return path.join(root, files[0]);
}

// Very basic identity—mirror what your getIdentity() does on the server.
// Read cookies: accountId / email (fall back from query/body if needed).
export function serverIdentity(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const get = (n: string) =>
    (cookie.split(/;\s*/).find(c => c.startsWith(n + "=")) || "")
      .split("=")[1] || "";

  const accountId = decodeURIComponent(get("accountId") || "");
  const email     = decodeURIComponent(get("agx_email") || get("email") || "");

  return { accountId, email };
}
