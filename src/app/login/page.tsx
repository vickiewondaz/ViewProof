"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

// Owner: email OTP sign-in. No passwords to forget, no app to download.
export default function OwnerLoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState("");

  const send = async () => {
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });
    setMsg(error ? error.message ?? "That didn't send — check the email and try again." : "Code sent! Check your email inbox now.");
    if (!error) setSent(true);
  };
  const verify = async () => {
    const { error } = await authClient.signIn.emailOtp({
      email,
      otp,
      name: email.split("@")[0],
    });
    if (error) setMsg(error.message ?? "Wrong code — try again.");
    else window.location.href = "/onboard";
  };

  return (
    <main className="mx-auto max-w-md md:max-w-lg px-4 py-6">
      <h1 className="font-display text-[32px] font-bold">Welcome back 👋</h1>
      <p className="mt-1 text-[16px]">
        Type your work email. We&apos;ll send 6 numbers — no password needed.
      </p>
      <label className="mt-4 block text-[16px] font-semibold" htmlFor="email">Work email</label>
      <input
        id="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@youragency.com"
        inputMode="email"
        autoComplete="email"
        className="mt-1 w-full rounded-xl border-2 border-line glass-soft glass-input px-4 py-4 text-[16px]"
      />
      <Button onClick={send} size="lg" className="mt-3 w-full">
        Send my code
      </Button>
      {sent && (
        <>
          <label className="mt-4 block text-[16px] font-semibold" htmlFor="otp">The 6 numbers from your email</label>
          <input
            id="otp"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="··· ···"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="tabular mt-1 w-full rounded-xl border-2 border-line glass-soft glass-input px-4 py-4 text-center text-2xl tracking-[0.4em]"
          />
          <Button onClick={verify} variant="secondary" size="lg" className="mt-3 w-full">
            Verify — let me in
          </Button>
        </>
      )}
      {msg && <p className="mt-3 text-[16px]" role="status">{msg}</p>}
    </main>
  );
}
