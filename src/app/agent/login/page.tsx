"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

// Agent: code arrives on WhatsApp — the app they already live in.
export default function AgentLoginPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
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
    if (error) setMsg(error.message ?? "Wrong code — try again.");
    else {
      setSignedIn(true);
      setMsg("You're in! One more tap to link your roster spot.");
    }
  };
  const claim = async () => {
    const res = await fetch("/api/agents/claim", { method: "POST" });
    const j = await res.json().catch(() => ({}));
    if (j.ok) window.location.href = "/agent";
    else setMsg(j.error ?? "Couldn't link — try again.");
  };

  return (
    <main className="mx-auto max-w-md md:max-w-lg px-4 py-6">
      <h1 className="text-[26px] font-bold">Hello 👋</h1>
      <p className="mt-1 text-[16px]">
        Type your WhatsApp number. We&apos;ll message you 6 numbers there.
      </p>
      <p className="mt-1 text-[14px] text-slate-500">
        No WhatsApp message yet? Tap the button anyway, then ask your manager to read you the code from the team desk.
      </p>
      <label className="mt-4 block text-[16px] font-semibold" htmlFor="phone">WhatsApp number</label>
      <input
        id="phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+234 800 000 0000"
        inputMode="tel"
        autoComplete="tel"
        className="mt-1 w-full rounded-xl border-2 border-slate-200 glass-soft glass-input px-4 py-4 text-[16px]"
      />
      <Button onClick={send} size="lg" className="mt-3 w-full">
        WhatsApp me the code
      </Button>
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
            className="tabular mt-1 w-full rounded-xl border-2 border-slate-200 glass-soft glass-input px-4 py-4 text-center text-2xl tracking-[0.4em]"
          />
          <Button onClick={verify} variant="secondary" size="lg" className="mt-3 w-full">
            Verify — let me in
          </Button>
        </>
      )}
      {msg && <p className="mt-3 text-[16px]" role="status">{msg}</p>}
      {signedIn && (
        <Button onClick={claim} size="lg" className="mt-3 w-full">
          Link my agent spot →
        </Button>
      )}
    </main>
  );
}
