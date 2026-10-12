import { Resend } from "resend";

// Owner email OTP delivery. Uses Resend when configured; logs in dev.
// Never include the OTP in any other channel or log line in production.
export async function sendEmailOtp(to: string, otp: string, type: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "ViewProof <login@viewproof.app>";
  if (!key) {
    console.log(`[email-otp:${type}] ${to} -> ${otp}`);
    return { delivered: false, reason: "no-key" };
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Your ViewProof code: ${otp}`,
    text: `Hello,\n\nYour ViewProof sign-in code is: ${otp}\n\nIt expires in 10 minutes. If you didn't ask for this, ignore this email — a person at your agency can help.\n\n— ViewProof`,
  });
  if (error) {
    console.warn("[email-otp] resend failed", error);
    return { delivered: false, reason: "send-failed" };
  }
  return { delivered: true };
}
