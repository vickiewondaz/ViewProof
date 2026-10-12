"use client";
import { useState } from "react";

export default function CancelButton({ bookingId }: { bookingId: string }) {
  const [msg, setMsg] = useState("");
  const cancel = async () => {
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel-buyer" }),
    });
    const j = await res.json().catch(() => ({}));
    setMsg(j.ok ? "Cancelled. Reply to the agency WhatsApp to rebook." : j.error ?? "Failed");
  };
  return (
    <>
      <button
        onClick={cancel}
        className="w-full rounded-xl bg-white px-4 py-4 text-[16px] font-semibold"
      >
        Can&apos;t make it? Cancel here
      </button>
      {msg && <p className="mt-2 text-[16px]">{msg}</p>}
    </>
  );
}
