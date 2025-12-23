// lib/shared/email-util.ts
export function normalizeEmail(input?: string | null): string {
  return (input ?? "").trim().toLowerCase();
}

export function isValidEmail(input?: string | null): boolean {
  const s = (input ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
