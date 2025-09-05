// app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";        // <-- important for nodemailer
export const dynamic = "force-dynamic"; // don't cache
export const revalidate = 0;

type Payload = {
  name: string;
  company?: string;
  email: string;
  areaCode?: string;
  phone?: string;
  message?: string;
};

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || "");

export async function POST(req: NextRequest) {
  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    name = "",
    company = "",
    email = "",
    areaCode = "",
    phone = "",
    message = "",
  } = body || ({} as Payload);

  if (!name.trim() || !isEmail(email)) {
    return NextResponse.json(
      { error: "Valid name and email are required" },
      { status: 400 }
    );
  }

  // Read SMTP + addressing from env
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.CONTACT_TO || process.env.SMTP_TO || user;
  const from =
    process.env.CONTACT_FROM ||
    process.env.SMTP_FROM ||
    (user ? `AgileXtract <${user}>` : undefined);

  if (!host || !port || !user || !pass || !to || !from) {
    // Fail gracefully so your client shows a clear toast
    return NextResponse.json(
      {
        error:
          "Contact service not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS and CONTACT_TO/CONTACT_FROM.",
      },
      { status: 500 }
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587/25/etc.
    auth: { user, pass },
  });

  const subject = `New contact request from ${name}`;
  const text = [
    `Name: ${name}`,
    `Company: ${company}`,
    `Email: ${email}`,
    `Phone: ${[areaCode, phone].filter(Boolean).join(" ")}`,
    "",
    "Message:",
    message,
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6">
      <h2>New contact request</h2>
      <p><b>Name:</b> ${escapeHtml(name)}</p>
      <p><b>Company:</b> ${escapeHtml(company)}</p>
      <p><b>Email:</b> ${escapeHtml(email)}</p>
      <p><b>Phone:</b> ${escapeHtml(
        [areaCode, phone].filter(Boolean).join(" ")
      )}</p>
      <p><b>Message:</b><br/>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
      replyTo: email, // so you can reply directly to the sender
    });

    // Your client only checks res.ok; still return a helpful body
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("contact route: sendMail failed", err);
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}

// tiny helper to avoid HTML injection in the email
function escapeHtml(s: string) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
