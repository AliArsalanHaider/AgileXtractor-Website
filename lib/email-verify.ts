// lib/email-verify.ts
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export function generateRawToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex"); // sent to user
}
export function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex"); // stored in DB
}

/** Create (or reuse valid) token for this email; returns record + `raw` when a fresh token is created. */
export async function issueEmailVerifyToken(email: string, ttlMs = 3600_000) {
  const now = new Date();
  const existing = await prisma.EmailVerifyToken.findFirst({
    where: { identifier: email, consumedAt: null, expires: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing as any; // reuse; we'll refresh hash below

  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const expires = new Date(Date.now() + ttlMs);

  const created = await prisma.EmailVerifyToken.create({
    data: { identifier: email, tokenHash, expires },
  });
  return { ...created, raw };
}

export async function consumeEmailVerifyToken(email: string, raw: string) {
  const now = new Date();
  const tokenHash = hashToken(raw);

  const rec = await prisma.emailVerifyToken.findFirst({
    where: {
      identifier: email,
      tokenHash,
      consumedAt: null,
      expires: { gt: now },
    },
  });
  if (!rec) return null;

  await prisma.$transaction([
    prisma.emailVerifyToken.update({
      where: { id: rec.id },
      data: { consumedAt: new Date() },
    }),
    prisma.user.updateMany({
      where: { email: { equals: email, mode: "insensitive" } },
      data: { emailVerified: new Date(), status: "active" }, // optional status bump
    }),
    prisma.emailVerifyToken.deleteMany({
      where: { identifier: email, consumedAt: null, id: { not: rec.id } },
    }),
  ]);

  return rec;
}
