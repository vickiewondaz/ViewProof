import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-md px-4 pb-10 pt-10">
      <p className="text-[14px] font-bold tracking-wide text-proof-600">
        VIEWPROOF
      </p>
      <h1 className="mt-2 text-[32px] font-bold leading-tight">
        See a place you trust, with someone you know
      </h1>
      <p className="mt-3 text-[18px]">
        Every card shows what the agency confirmed and when. Booking is free,
        on WhatsApp — no app, no account, no wahala.
      </p>
      <div className="mt-6 grid gap-3">
        <Link
          href="/dashboard"
          className="rounded-xl bg-proof-600 px-4 py-4 text-center text-[18px] font-bold text-white"
        >
          I run an agency
        </Link>
        <Link
          href="/agent"
          className="rounded-xl bg-white px-4 py-4 text-center text-[18px] font-bold"
        >
          I&apos;m hosting viewings
        </Link>
      </div>
      <p className="mt-6 text-[16px] text-slate-500">
        Honest note: we don&apos;t check title or ownership. We show you what
        the agency confirmed, when they confirmed it, and who will meet you —
        so nothing is hidden.
      </p>
    </main>
  );
}
