import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP, phoneNumber, admin } from "better-auth/plugins";
import { prisma } from "./db";
import { sendAuthCode } from "./whatsapp";
import { sendEmailOtp } from "./email";

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
        // Resend in production (set RESEND_API_KEY + EMAIL_FROM); console in dev.
        void sendEmailOtp(email, otp, type);
      },
    }),
    phoneNumber({
      otpLength: 6,
      expiresIn: 600,
      allowedAttempts: 5,
      sendOTP: ({ phoneNumber, code }) => {
        // Agents receive login codes on WhatsApp (authentication template).
        // Fire-and-forget to avoid timing attacks.
        void sendAuthCode(phoneNumber, code).catch((e) =>
          console.warn("[phone-otp] whatsapp send failed", e)
        );
      },
      signUpOnVerification: {
        getTempEmail: (phoneNumber) => `${phoneNumber}@viewproof.local`,
        getTempName: (phoneNumber) => phoneNumber,
      },
    }),
    // Platform admin: user management (ban, roles, impersonate) for the
    // landlord's office. First admin via: npx auth create-admin --email you@...
    admin({
      defaultRole: "seeker",
      bannedUserMessage: "This account is paused. Talk to ViewProof support on WhatsApp if this is a mistake.",
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
