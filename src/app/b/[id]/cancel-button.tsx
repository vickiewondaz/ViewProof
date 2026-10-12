"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function CancelButton({ bookingId }: { bookingId: string }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const cancel = async () => {
    setBusy(true);
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel-buyer" }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(j.ok ? "Cancelled. Reply to the agency WhatsApp to rebook." : j.error ?? "Failed");
  };
  return (
    <>
      <Button onClick={cancel} disabled={busy} variant="secondary" className="w-full">
        Can&apos;t make it? Cancel here
      </Button>
      {msg && (
        <p className="mt-2 text-[16px]" role="status">
          {msg}
        </p>
      )}
    </>
  );
}
