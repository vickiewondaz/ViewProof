"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

// Agent: phone OTP via WhatsApp (Better Auth phoneNumber).
export default function AgentLoginPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState("");

  const send = async () => {
    const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber: phone });
    setMsg(error ? error.message ?? "Failed to send" : "Code sent on WhatsApp.");
    if (!error) setSent(true);
  };
  const verify = async () => {
    const { error } = await authClient.phoneNumber.verify({
      phoneNumber: phone,
      code,
    });
    setMsg(error ? error.message ?? "Invalid code" : "Signed in.");
  };

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-[26px] font-bold">Agent sign in</h1>
      <p className="mt-1 text-sm">WhatsApp OTP. Works on the same PWA/APK.</p>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+234..."
        className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
      />
      <button
        onClick={send}
        className="mt-2 w-full rounded-xl bg-proof-600 px-4 py-3 text-white"
      >
        Send WhatsApp code
      </button>
      {sent && (
        <>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
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
