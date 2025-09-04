import { prisma } from "@/lib/prisma";

export async function consumeCredits(email: string, amount: number) {
  // 1. Upsert the account (create if not exists)
  const acc = await prisma.accountCredits.upsert({
    where: { email },
    update: {},
    create: { email, totalCredits: 0, consumedCredits: 0, active: true, remainingCredits: 0 },
    select: { totalCredits: true, consumedCredits: true },
  });

  const remaining = acc.totalCredits - acc.consumedCredits;
  if (remaining < amount) throw new Error("Insufficient credits");

  // 2. Update credits
  const updated = await prisma.accountCredits.update({
    where: { email },
    data: {
      consumedCredits: { increment: amount },
      remainingCredits: { decrement: amount },
    },
    select: { email: true, totalCredits: true, consumedCredits: true, remainingCredits: true, active: true },
  });

  return updated;
}