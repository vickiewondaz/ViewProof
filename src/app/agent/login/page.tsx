"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

// Agent: code arrives on WhatsApp — the app they already live in.
export default function AgentLoginPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState("");

  const send = async () => {
    const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber: phone });
    setMsg(error ? error.message ?? "That didn't send — check the number and try again." : "Code sent! Open WhatsApp now.");
    if (!error) setSent(true);
  };
  const verify = async () => {
    const { error } = await authClient.phoneNumber.verify({
      phoneNumber: phone,
      code,
    });
    setMsg(error ? error.message ?? "Wrong code — try again." : "You're in! Your today's viewings are waiting.");
  };

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-[26px] font-bold">Hello 👋</h1>
      <p className="mt-1 text-[16px]">
        Type your WhatsApp number. We&apos;ll message you 6 numbers there.
      </p>
      <label className="mt-4 block text-[16px] font-semibold" htmlFor="phone">WhatsApp number</label>
      <input
        id="phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+234 800 000 0000"
        inputMode="tel"
        autoComplete="tel"
        className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-4 text-[16px]"
      />
      <button
        onClick={send}
        className="mt-3 w-full rounded-xl bg-proof-600 px-4 py-4 text-[18px] font-bold text-white"
      >
        WhatsApp me the code
      </button>
      {sent && (
        <>
          <label className="mt-4 block text-[16px] font-semibold" htmlFor="code">The 6 numbers from WhatsApp</label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="··· ···"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="tabular mt-1 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-4 text-center text-2xl tracking-[0.4em]"
          />
          <button
            onClick={verify}
            className="mt-3 w-full rounded-xl bg-white px-4 py-4 text-[18px] font-bold"
          >
            Verify — let me in
          </button>
        </>
      )}
      {msg && <p className="mt-3 text-[16px]" role="status">{msg}</p>}
    </main>
  );
}
