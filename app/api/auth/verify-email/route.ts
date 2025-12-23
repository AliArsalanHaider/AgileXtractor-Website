import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  const email = (searchParams.get("email") || "").trim().toLowerCase();

  if (!token || !email) {
    return NextResponse.redirect(new URL("/login?verified=0", req.url));
  }

  // Find matching token
  const t = await prisma.emailToken.findFirst({
    where: {
      token,
      email: { equals: email, mode: "insensitive" },
      expiresAt: { gt: new Date() },
    },
    select: { id: true, userId: true },
  });

  if (!t) {
    // invalid/expired
    return NextResponse.redirect(new URL(`/login?verified=0&email=${encodeURIComponent(email)}`, req.url));
  }

  // Mark user verified & active; flip Registration.active = true
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: t.userId },
      data: { emailVerified: new Date(), status: "active" },
    });

    // Your Registration table is keyed by email
    await tx.registration.updateMany({
      where: { email: { equals: email, mode: "insensitive" } },
      data: { active: true },
    });

    // Consume token (delete)
    await tx.emailToken.delete({ where: { id: t.id } });
  });

  // Redirect to login with a success flag (and email prefill)
  const to = new URL(`/login?verified=1&email=${encodeURIComponent(email)}`, req.url);
  return NextResponse.redirect(to);
}
