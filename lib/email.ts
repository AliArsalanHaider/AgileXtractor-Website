// lib/email.ts
import "server-only";
import nodemailer from "nodemailer";

const {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
  NODE_ENV,
} = process.env;

function mask(s?: string) {
  if (!s) return "";
  if (s.length <= 6) return "***";
  return s.slice(0, 2) + "***" + s.slice(-2);
}

// Create the transporter lazily, only on the server
export async function getTransport() {
  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS || !EMAIL_FROM) {
    throw new Error(
      `Missing mail env. host=${EMAIL_HOST} port=${EMAIL_PORT} user=${EMAIL_USER} from=${EMAIL_FROM}`
    );
  }

  const port = Number(EMAIL_PORT);
  const secure = port === 465; // 465=true (SSL), 587=false (STARTTLS)

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port,
    secure,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    tls: { rejectUnauthorized: true }, // if your SMTP uses valid cert
  });

  // Optional: verify connection once (costs one round-trip)
  try {
    await transporter.verify();
  } catch (e: any) {
    // throw to make it visible in logs
    throw new Error(`SMTP verify failed: ${e?.message || e}`);
  }

  if (NODE_ENV !== "production") {
    console.log(
      "[MAILER READY]",
      JSON.stringify(
        {
          host: EMAIL_HOST,
          port,
          user: mask(EMAIL_USER),
          from: EMAIL_FROM,
          secure,
        },
        null,
        2
      )
    );
  }

  return transporter;
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const transporter = await getTransport();
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif">
      <h2>Verify your email</h2>
      <p>Click the button below to verify your email. The link is valid for 1 hour.</p>
      <p><a href="${verifyUrl}" 
            style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">
            Verify Email
         </a></p>
      <p>If the button doesn't work, copy and paste this URL:</p>
      <p style="word-break:break-all;"><a href="${verifyUrl}">${verifyUrl}</a></p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: EMAIL_FROM!,
    to,
    subject: "Verify your email",
    html,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("[MAIL SENT] messageId=", info.messageId);
  }
  return info;
}
