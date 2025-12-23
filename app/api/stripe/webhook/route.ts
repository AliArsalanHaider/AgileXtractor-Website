//app/api/stripe/webhook/route.ts

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const config = {
  api: { bodyParser: false },
};

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !whSecret) {
    console.error("Missing stripe signature or webhook secret");
    return NextResponse.json({ received: true });
  }

  let event;

  try {
    const raw = await req.text();
    event = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature failed:", err.message);
    return new NextResponse("Bad signature", { status: 400 });
  }

  try {
    // Stripe fires this after a successful one-time credit purchase
    if (event.type === "checkout.session.completed") {
      const session: any = event.data.object;

      const email = session.customer_email;
      const creditsPurchased = Number(session.metadata?.credits || 0);

      if (!email || !creditsPurchased) {
        console.error("❌ Missing email or credits in webhook metadata");
        return NextResponse.json({ received: true });
      }

      // Fetch user from Registration table
      const user = await prisma.registration.findUnique({
        where: { email: email },  // email maps to Email_ID column
      });

      if (!user) {
        console.error("❌ No Registration record for:", email);
        return NextResponse.json({ received: true });
      }

      // Update credits
      const updated = await prisma.registration.update({
        where: { email: email },
        data: {
          totalCredits: user.totalCredits + creditsPurchased,
          remainingCredits: user.remainingCredits + creditsPurchased,
        },
      });

      console.log(
        `✔ SUCCESS: Added ${creditsPurchased} credits to ${email}`,
        `→ New total: ${updated.totalCredits}, Remaining: ${updated.remainingCredits}`
      );
    }

  } catch (err: any) {
    console.error("❌ Webhook handler error:", err);
  }

  return NextResponse.json({ received: true });
}
