"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

// Owner: email OTP sign-in (Better Auth emailOTP).
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
    setMsg(error ? error.message ?? "Failed to send" : "Code sent — check email.");
    if (!error) setSent(true);
  };
  const verify = async () => {
    const { error } = await authClient.signIn.emailOtp({
      email,
      otp,
      name: email.split("@")[0],
    });
    setMsg(error ? error.message ?? "Invalid code" : "Signed in.");
  };

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-[26px] font-bold">Owner sign in</h1>
      <p className="mt-1 text-sm">Email OTP via Better Auth. No passwords.</p>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="owner@agency.com"
        className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
      />
      <button
        onClick={send}
        className="mt-2 w-full rounded-xl bg-proof-600 px-4 py-3 text-white"
      >
        Send code
      </button>
      {sent && (
        <>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="6-digit code"
            inputMode="numeric"
            className="tabular mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center tracking-[0.4em]"
          />
          <button
            onClick={verify}
            className="mt-2 w-full rounded-xl bg-white px-4 py-3 font-semibold"
          >
            Verify + sign in
          </button>
        </>
      )}
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </main>
  );
}
