import Link from "next/link";
import { Button } from "@/components/ui/button";

const STEPS = [
  { title: "1. Share a card", text: "Agency posts a Viewing Card with fresh dates and a named host." },
  { title: "2. Book free on WhatsApp", text: "Buyer picks a time. No app, no account, confirmation in seconds." },
  { title: "3. Meet + confirm with code", text: "Agent and buyer confirm with 6 numbers. Both get a receipt." },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-10">
      {/* Hero: estate-kit split — serif promise left, featured card right. */}
      <section className="grid items-center gap-8 py-10 md:grid-cols-2 md:py-16">
        <div>
          <p className="eyebrow">ViewProof · Lagos & Abuja</p>
          <h1 className="font-display mt-3 text-[38px] font-bold leading-[1.05] md:text-[56px]">
            See a place you trust, with someone you know
          </h1>
          <p className="mt-4 text-[18px] text-clay">Fresh cards. Named hosts. Free WhatsApp booking.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg"><Link href="/dashboard">I run an agency</Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href="/agent">I&apos;m hosting viewings</Link></Button>
          </div>
          <dl className="mt-8 flex gap-8">
            <div>
              <dt className="eyebrow">Booking fee</dt>
              <dd className="font-display text-[28px] font-bold">₦0</dd>
            </div>
            <div>
              <dt className="eyebrow">Code check-in</dt>
              <dd className="font-display text-[28px] font-bold">6 digits</dd>
            </div>
            <div>
              <dt className="eyebrow">Title verified</dt>
              <dd className="font-display text-[28px] font-bold">Never*</dd>
            </div>
          </dl>
        </div>
        <div className="glass overflow-hidden">
          <div className="photo-fallback relative flex min-h-[240px] items-end p-5 md:min-h-[300px]">
            <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[14px] font-bold text-pine-950">
              Featured · Gwarinpa
            </span>
            <div>
              <p className="font-display text-[30px] font-bold leading-tight">3-bedroom · Gwarinpa, Abuja</p>
              <p className="tabular mt-1 text-[22px] font-bold text-brass-100">₦4,000,000 <span className="text-[16px] font-normal opacity-80">yearly</span></p>
            </div>
          </div>
          <ul className="grid gap-2 p-5 text-[16px] md:p-6">
            <li>✓ Confirmed fresh: 10 October</li>
            <li>✓ Hosted by BrightHomes · you&apos;ll meet Emeka</li>
            <li>ⓘ Title not checked — ask the agency how they confirm it</li>
          </ul>
          <div className="px-5 pb-5 md:px-6 md:pb-6">
            <Button asChild size="lg" className="w-full"><Link href="/c/3-bedroom-apartment-gwarinpa-demo1">Book a free viewing</Link></Button>
          </div>
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

      <p className="mx-auto mt-8 max-w-2xl text-center text-[16px] text-clay">
        We don&apos;t verify title. We show what the agency confirmed — and who&apos;ll meet you.
        <br />*Never means never: honesty is the product.
      </p>
    </main>
  );
}
