import Link from "next/link";

const STEPS = [
  { title: "1. Share a card", text: "Agency posts a Viewing Card with fresh dates and a named host." },
  { title: "2. Book free on WhatsApp", text: "Buyer picks a time. No app, no account, confirmation in seconds." },
  { title: "3. Meet + confirm with code", text: "Agent and buyer confirm with 6 numbers. Both get a receipt." },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-10">
      {/* Hero: stacked on phones, two columns on desktop. */}
      <section className="grid items-center gap-6 py-8 md:grid-cols-2 md:py-14">
        <div>
          <p className="text-[14px] font-bold tracking-wide text-proof-600">VIEWPROOF</p>
          <h1 className="mt-2 text-[34px] font-bold leading-tight md:text-[48px]">
            See a place you trust, with someone you know
          </h1>
          <p className="mt-3 text-[18px]">Fresh cards. Named hosts. Free WhatsApp booking.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard"
              className="rounded-xl bg-proof-600 px-4 py-4 text-center text-[18px] font-bold text-white"
            >
              I run an agency
            </Link>
            <Link
              href="/agent"
              className="rounded-xl glass-soft px-4 py-4 text-center text-[18px] font-bold"
            >
              I&apos;m hosting viewings
            </Link>
          </div>
        </div>
        <div className="glass rounded-2xl p-5 md:p-8">
          <p className="text-[14px] font-bold text-proof-600">EXAMPLE CARD</p>
          <p className="mt-1 text-[22px] font-bold">3-bedroom · Gwarinpa, Abuja</p>
          <p className="tabular mt-1 text-[18px]">₦4,000,000 yearly</p>
          <ul className="mt-3 grid gap-2 text-[16px]">
            <li>✓ Confirmed fresh: 10 October</li>
            <li>✓ Hosted by BrightHomes · you&apos;ll meet Emeka</li>
            <li>ⓘ Title not checked — ask the agency how they confirm it</li>
          </ul>
          <span className="mt-4 block rounded-xl bg-proof-600 px-4 py-4 text-center text-[18px] font-bold text-white">
            Book a free viewing
          </span>
        </div>
      </section>

      {/* How it works: 1 col phones → 3 col desktop. */}
      <section className="grid gap-3 md:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.title} className="glass rounded-2xl p-5">
            <p className="text-[18px] font-bold">{s.title}</p>
            <p className="mt-1 text-[16px]">{s.text}</p>
          </div>
        ))}
      </section>

      <p className="mx-auto mt-8 max-w-2xl text-center text-[16px] text-slate-500">
        We don&apos;t verify title. We show what the agency confirmed — and who&apos;ll meet you.
      </p>
    </main>
  );
}
