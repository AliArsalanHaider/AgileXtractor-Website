// lib/storage.ts
import { promises as fs } from "fs";
import path from "path";

function storageRoot() {
  // Windows path supported. Example:
  // FILE_STORAGE_ROOT=C:\AgileXtract-DonotDelet\DocumentStorage
  const root = process.env.FILE_STORAGE_ROOT || "C:\\AgileXtract-DonotDelet\\DocumentStorage";
  return path.resolve(root);
}

/** Creates directory if missing */
export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

/** Safe file name to avoid weird characters */
export function safeFileName(name: string) {
  return name.replace(/[^\w.\-()+\s]/g, "_");
}

/** Returns { absDir, absPath } for (accountId/yyyy/mm/filename) */
export async function makeTargetPath(accountId: number | string, fileName: string) {
  const root = storageRoot();
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  const relDir = path.join(String(accountId), yyyy, mm);
  const absDir = path.join(root, relDir);
  await ensureDir(absDir);

  const base = safeFileName(fileName);
  const absPath = path.join(absDir, base);
  return { absDir, absPath };
}

export async function fileExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
