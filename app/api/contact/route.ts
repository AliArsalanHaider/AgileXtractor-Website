// app/api/contact/route.ts
import type { NextRequest } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const isDev = process.env.NODE_ENV !== "production";

export async function GET() {
  // Quick health check
  return Response.json({ ok: true, route: "alive" });
}

// Hit /api/contact/verify to only test SMTP login/STARTTLS.
export async function HEAD() {
  try {
    const transporter = makeTransport();
    await transporter.verify();
    return new Response(null, { status: 204 });
  } catch (e: any) {
    return jsonErr("verify", e, 502);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, company, email, areaCode, phone, message } = await req.json();

    if (!name || !email) {
      return new Response("Missing required fields: name, email", { status: 400 });
    }

    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD;
    const to = process.env.CONTACT_EMAIL || process.env.EMAIL_USER;

    const missing = [
      !user && "EMAIL_USER",
      !pass && "EMAIL_PASSWORD",
      !to && "CONTACT_EMAIL|EMAIL_USER",
    ].filter(Boolean) as string[];

    if (missing.length) {
      const msg = `Missing env vars: ${missing.join(", ")}`;
      return new Response(isDev ? msg : "Server not configured", { status: 500 });
    }

    const transporter = makeTransport();

    // Fail fast with clear SMTP message
    try {
      await transporter.verify();
    } catch (e: any) {
      return jsonErr("verify", e, 502);
    }

    const html = `
      <h2>New Contact Request</h2>
      <p><strong>Name:</strong> ${esc(name)}</p>
      <p><strong>Company:</strong> ${esc(company || "")}</p>
      <p><strong>Email:</strong> ${esc(email)}</p>
      <p><strong>Phone:</strong> ${esc(`${areaCode || ""} ${phone || ""}`)}</p>
      <p><strong>Message:</strong></p>
      <pre style="background:#f6f8fa;padding:12px;border-radius:8px;white-space:pre-wrap;">${esc(
        message || ""
      )}</pre>
    `;

    try {
      await transporter.sendMail({
        from: { name: "Website Contact", address: user! }, // must be the authenticated mailbox for many providers
        to: to!,
        subject: `New Contact: ${name}`,
        replyTo: email,
        html,
      });
    } catch (e: any) {
      return jsonErr("sendMail", e, 502);
    }

    return Response.json({ ok: true });
  } catch (e: any) {
    return jsonErr("route", e, 500);
  }
}

/* ---------------- helpers ---------------- */

function makeTransport() {
  const host = process.env.EMAIL_HOST || "smtp.zoho.com";
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER!;
  const pass = process.env.EMAIL_PASSWORD!;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = implicit TLS; 587/25 = STARTTLS
    auth: { user, pass },
    authMethod: "LOGIN",
    tls: {
      minVersion: "TLSv1.2",
      ...(isDev ? { rejectUnauthorized: false } : {}),
    },
    logger: isDev,
    debug: isDev,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
  });
}

function esc(s: string) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function jsonErr(stage: "verify" | "sendMail" | "route", e: any, status: number) {
  // In dev we return rich diagnostics to help you fix; in prod we hide details.
  if (isDev) {
    return Response.json(
      {
        ok: false,
        stage,
        message: e?.message || String(e),
        code: e?.code,
        command: e?.command,
        response: e?.response, // SMTP server text (very useful)
        responseCode: e?.responseCode,
        stack: e?.stack,
      },
      { status }
    );
  }
  return new Response(stage === "verify" ? "Mail service unavailable" : "Failed to send", {
    status,
  });
}
