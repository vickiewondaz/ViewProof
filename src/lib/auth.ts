import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP, phoneNumber } from "better-auth/plugins";
import { prisma } from "./db";
import { sendWhatsApp } from "./whatsapp";

// Better Auth — Owner: email OTP. Agent: phone OTP via WhatsApp Cloud API.
// Truth rules unchanged: OTP only proves contact reachability, never title/ownership.

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  advanced: { database: { joins: true } },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "seeker", required: false },
      agencyId: { type: "string", required: false },
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      allowedAttempts: 5,
      async sendVerificationOTP({ email, otp, type }) {
        // TODO: plug Resend/SES. Dev: log only — never commit real keys.
        console.log(`[email-otp:${type}] ${email} -> ${otp}`);
      },
    }),
    phoneNumber({
      otpLength: 6,
      expiresIn: 600,
      allowedAttempts: 5,
      sendOTP: ({ phoneNumber, code }) => {
        // Agents receive OTP on WhatsApp (free-tier auth template).
        // Fire-and-forget to avoid timing attacks.
        void sendWhatsApp({
          to: phoneNumber,
          template: "receipt",
          components: [],
        }).catch((e) => console.warn("[phone-otp] whatsapp send failed", e));
        console.log(`[phone-otp] ${phoneNumber} -> ${code}`);
      },
      signUpOnVerification: {
        getTempEmail: (phoneNumber) => `${phoneNumber}@viewproof.local`,
        getTempName: (phoneNumber) => phoneNumber,
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
