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
        "WhatsApp the agency — a person replies."
      )}
    </p>
  );
}

export function OfflineNote() {
  return (
    <p className="mt-3 rounded-xl bg-sun-100 p-3 text-center text-[16px]">
      Offline? Saved passes still open.
    </p>
  );
}

export function waLink(contact: string, text: string): string | null {
  const digits = contact.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function PausedNotice({ contact, title, area }: { contact?: string | null; title: string; area: string }) {
  const link = contact ? waLink(contact, `Hi! Tell me when ${title} (${area}) is fresh again.`) : null;
  return (
    <div className="mt-4 rounded-xl bg-slate-200/60 p-4">
      <p className="text-[16px] font-semibold">Paused for now</p>
      <p className="mt-1 text-[16px]">
        Booking is closed until the agency reconfirms. Ping them on WhatsApp.
      </p>
      {link ? (
        <a href={link} target="_blank" rel="noreferrer" className="mt-3 block rounded-xl glass-soft px-4 py-3 text-center text-[16px] font-semibold">
          Notify me on WhatsApp
        </a>
      ) : null}
    </div>
  );
}

export function EmptySlots({ contact }: { contact?: string | null }) {
  const link = contact ? waLink(contact, "Hi! Tell me when new viewing times open.") : null;
  return (
    <div className="rounded-xl bg-sand-100 p-4 text-center">
      <p className="text-[16px] font-semibold">No free slots right now</p>
      <p className="mt-1 text-[16px]">New times appear when the agency reconfirms.</p>
      {link ? (
        <a href={link} target="_blank" rel="noreferrer" className="mt-3 block rounded-xl glass-soft px-4 py-3 text-[16px] font-semibold">
          Notify me on WhatsApp
        </a>
      ) : (
        <p className="mt-2 text-[16px]">Ask the agency on WhatsApp for new times.</p>
      )}
    </div>
  );
}
