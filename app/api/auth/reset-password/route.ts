// app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const shape = z.object({
  email: z.string().email(),
  token: z.string().min(10),
  // accept multiple aliases
  newPassword: z.string().min(8).max(128),
});

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const ct = (req.headers.get("content-type") || "").toLowerCase();

    // Pull from JSON, FormData, and querystring
    let email: string | undefined;
    let token: string | undefined;
    let pass: string | undefined;

    if (ct.includes("application/json")) {
      const j = await req.json().catch(() => ({} as any));
      email = j?.email;
      token = j?.token;
      pass = j?.newPassword ?? j?.new_password ?? j?.password;
    } else if (
      ct.includes("application/x-www-form-urlencoded") ||
      ct.includes("multipart/form-data")
    ) {
      const fd = await req.formData();
      email = String(fd.get("email") ?? "");
      token = String(fd.get("token") ?? "");
      pass = String(
        fd.get("newPassword") ?? fd.get("new_password") ?? fd.get("password") ?? ""
      );
    }

    // Fallbacks from URL
    email = (email || url.searchParams.get("email") || "").trim();
    token = (token || url.searchParams.get("token") || "").trim();

    // Validate
    const { email: validEmail, token: validToken, newPassword } = shape.parse({
      email,
      token,
      newPassword: pass,
    });

    const normalizedEmail = validEmail.toLowerCase().trim();
    const tokenHash = sha256(validToken);

    // Verify token (unconsumed + not expired)
    const tokenRow = await prisma.emailVerifyToken.findFirst({
      where: {
        identifier: { equals: normalizedEmail, mode: "insensitive" },
        tokenHash,
        consumedAt: null,
        expires: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!tokenRow) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    // Hash once
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update User.passwordHash (if present)
    const user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      select: { id: true },
    });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
    }

    // Update Registration.profile.passwordHash (preserve all other keys)
    const reg = await prisma.registration.findUnique({
      where: { email: normalizedEmail },
      select: { profile: true },
    });

    if (reg) {
      const current = (reg.profile && typeof reg.profile === "object" ? reg.profile : {}) as Record<string, any>;
      const merged = {
        ...current,
        passwordHash,
        // touch a timestamp without touching any other keys
        lastUpdated: new Date().toISOString(),
      };

      await prisma.registration.update({
        where: { email: normalizedEmail },
        data: { profile: merged },
      });
    }

    // Consume token
    await prisma.emailVerifyToken.update({
      where: { id: tokenRow.id },
      data: { consumedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json(
        {
          error: "Invalid input",
          issues: e.issues?.map((i: any) => ({
            path: i.path?.join(".") || "",
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }
    console.error("reset-password error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
