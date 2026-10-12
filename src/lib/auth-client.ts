"use client";
import { createAuthClient } from "better-auth/react";
import { emailOTPClient, phoneNumberClient, adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [emailOTPClient(), phoneNumberClient(), adminClient()],
});

export const { signIn, signUp, useSession } = authClient;
