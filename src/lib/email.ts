import { Resend } from "resend";
import nodemailer from "nodemailer";

// Owner email OTP delivery. Priority: Resend → Gmail SMTP → dev console log.
// Never include the OTP in any other channel or log line in production.
const OTP_TEXT = (otp: string) =>
  `Hello,\n\nYour ViewProof sign-in code is: ${otp}\n\nIt expires in 10 minutes. If you didn't ask for this, ignore this email — a person at your agency can help.\n\n— ViewProof`;

export async function sendEmailOtp(to: string, otp: string, type: string) {
  const from = process.env.EMAIL_FROM ?? "ViewProof <login@viewproof.app>";
  const subject = `Your ViewProof code: ${otp}`;

  // 1. Resend (needs verified domain for real recipients).
  const key = process.env.RESEND_API_KEY;
  if (key) {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({ from, to, subject, text: OTP_TEXT(otp) });
    if (error) {
      console.warn("[email-otp] resend failed", error);
    } else {
      return { delivered: true };
    }
  }

  // 2. Gmail SMTP (SMTP_USER + SMTP_PASS = Google App Password, not the login).
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST ?? "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: (process.env.SMTP_PORT ?? "587") === "465",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transport.sendMail({ from, to, subject, text: OTP_TEXT(otp) });
      return { delivered: true };
    } catch (e) {
      console.warn("[email-otp] smtp failed", (e as Error).message);
      return { delivered: false, reason: "send-failed" };
    }
  }

  // 3. Dev: log only.
  if (!key) console.log(`[email-otp:${type}] ${to} -> ${otp}`);
  return { delivered: false, reason: key ? "send-failed" : "no-key" };
}
