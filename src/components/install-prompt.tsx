"use client";
import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

// Gentle install nudge: first eligible moment only, dismissable forever.
export default function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [hide, setHide] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("vp-install-dismissed")) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!evt || hide) return null;
  return (
    <div className="glass mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl p-3">
      <p className="flex-1 text-[16px]">
        <span className="font-bold">Add ViewProof to your home screen?</span>
        <br />
        Your passes open even offline.
      </p>
      <button
        onClick={async () => {
          await evt.prompt();
          localStorage.setItem("vp-install-dismissed", "1");
          setHide(true);
        }}
        className="shrink-0 rounded-xl bg-proof-600 px-4 py-3 text-[16px] font-bold text-white"
      >
        Install
      </button>
      <button
        onClick={() => {
          localStorage.setItem("vp-install-dismissed", "1");
          setHide(true);
        }}
        aria-label="Not now"
        className="glass-soft min-h-[48px] min-w-[48px] shrink-0 rounded-xl font-bold"
      >
        ×
      </button>
    </div>
  );
}
