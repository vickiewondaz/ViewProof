"use client";
import { useEffect, useState } from "react";

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

// Thin banner under the header, only while offline. Plain words, no panic.
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <p role="status" className="bg-pine-950 px-4 py-2 text-center text-[14px] font-semibold text-brass-100">
      You&apos;re offline — saved passes open, check-ins queue and sync later.
    </p>
  );
}

// Outbox for agent check-ins: saved locally, flushed in order on reconnect.
// A 409 means the booking already left Confirmed state (synced by another
// attempt) — reconcile against today's diary instead of duplicating.
const KEY = "vp-checkin-outbox";
export type QueuedCheckin = { bookingId: string; code?: string; action: string; at: number };

export function loadOutbox(): QueuedCheckin[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function queueCheckin(q: QueuedCheckin) {
  const all = [...loadOutbox(), q].slice(-20);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function dropQueued(bookingId: string, action: string) {
  localStorage.setItem(
    KEY,
    JSON.stringify(loadOutbox().filter((q) => !(q.bookingId === bookingId && q.action === action)))
  );
}
