// Human-first shared bits: plain language, big targets, always a next step.
// Every screen ends with a human: "Talk to the agency" — never a dead end.

export function HelpFooter({ contact }: { contact?: string | null }) {
  return (
    <p className="mt-4 text-center text-[16px] text-slate-500">
      Need help?{" "}
      {contact ? (
        <span>
          Talk to the agency: <span className="font-semibold">{contact}</span>
        </span>
      ) : (
        "Talk to the agency on WhatsApp — a person will reply."
      )}
    </p>
  );
}

export function OfflineNote() {
  return (
    <p className="mt-3 rounded-xl bg-sun-100 p-3 text-center text-[16px]">
      No network? No wahala — your saved pass still opens. We&apos;ll sync when
      you&apos;re back online.
    </p>
  );
}

export function EmptySlots() {
  return (
    <div className="rounded-xl bg-sand-100 p-4 text-center">
      <p className="text-[16px] font-semibold">No free slots right now</p>
      <p className="mt-1 text-[16px]">
        New times open when the agency reconfirms. Tap below and we&apos;ll
        tell you on WhatsApp.
      </p>
      <button className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-[16px] font-semibold">
        Notify me on WhatsApp
      </button>
    </div>
  );
}
