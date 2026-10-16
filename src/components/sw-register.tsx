"use client";
import { useEffect } from "react";

// Explicit service-worker registration (next-pwa builds /sw.js but does not
// reliably auto-register under the App Router). Without this, offline
// passes, cached cards, and queued check-ins silently never work.
export default function SWRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => null);
  }, []);
  return null;
}
