import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { EmptySlots, HelpFooter } from "@/components/human";

async function getCard(slug: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const res = await fetch(`${proto}://${host}/api/cards/${slug}`, {
    next: { revalidate: 60 },
  }).catch(() => null);
  return res?.ok ? res.json() : null;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const data = await getCard(params.slug);
  const c = data?.card;
  return {
    title: c ? `${c.title} — ${c.area} | ViewProof` : "Viewing Card | ViewProof",
    description: c
      ? `${c.title} in ${c.area}. Refreshed ${c.lastConfirmedAt}. Hosted by ${c.agency?.name}. Title not verified.`
      : "Accountable property viewings.",
  };
}

export default async function ViewingCardPage({
  params,
}: {
  params: { slug: string };
}) {
  const data = await getCard(params.slug);
  const c = data?.card;
  if (!c)
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-[26px] font-bold">Hmm, this card is gone</h1>
        <p className="mt-2 text-[16px]">
          The agency may have paused or removed this listing. Nothing was taken
          from you — bookings here are always free.
        </p>
        <Link
          href="/"
          className="mt-4 block rounded-xl bg-proof-600 px-4 py-3 text-center text-[16px] text-white"
        >
          Back home
        </Link>
        <HelpFooter />
      </main>
    );

  return (
    <main className="mx-auto max-w-md px-4 pb-10 pt-6">
      <div className="overflow-hidden rounded-2xl bg-white">
        {c.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.images[0]}
            alt={`${c.title}, ${c.area}`}
            className="h-52 w-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="flex h-40 items-center justify-center bg-sand-100 px-4 text-center text-[16px]">
            Photos coming — the agency hasn&apos;t added clear pictures yet.
          </div>
        )}
        <div className="p-4">
          <h1 className="text-[26px] font-bold leading-tight">{c.title}</h1>
          <p className="mt-1 text-[16px]">{c.area}</p>
          <p className="tabular mt-2 text-[20px] font-bold">
            {c.currency} {Number(c.price).toLocaleString()}
          </p>
          <ul className="mt-3 grid gap-2 text-[16px]">
            <li>✓ Confirmed fresh: {new Date(c.lastConfirmedAt).toDateString()}</li>
            <li>✓ Hosted by {c.agency?.name}</li>
            {c.host && <li>✓ You&apos;ll meet: {c.host}</li>}
            {c.photographedAt && (
              <li>✓ Pictures taken: {new Date(c.photographedAt).toDateString()}</li>
            )}
            <li>ⓘ We don&apos;t check title or ownership — ask the agency how they confirm it.</li>
          </ul>
          {c.paused ? (
            <div className="mt-4 rounded-xl bg-slate-200/60 p-4">
              <p className="text-[16px] font-semibold">Paused for now</p>
              <p className="mt-1 text-[16px]">
                The agency hasn&apos;t reconfirmed this place, so booking is
                closed. Leave your number and we&apos;ll message you on WhatsApp
                when it&apos;s fresh.
              </p>
              <button className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-[16px] font-semibold">
                Notify me on WhatsApp
              </button>
            </div>
          ) : (
            <>
              <h2 className="mt-5 text-[18px] font-bold">Pick a time that suits you</h2>
              <div className="mt-2 grid gap-2" id="book">
                {(c.slots ?? []).slice(0, 6).map((s: { id: string; startsAt: string; left: number }) => (
                  <button
                    key={s.id}
                    disabled={s.left <= 0}
                    aria-label={`Book ${new Date(s.startsAt).toLocaleString()}, ${s.left} places left`}
                    className="min-h-[56px] rounded-xl border-2 border-slate-200 px-4 py-3 text-left text-[16px] disabled:opacity-50"
                  >
                    <span className="font-semibold">{new Date(s.startsAt).toLocaleString()}</span>
                    <br />
                    <span>{s.left > 0 ? `${s.left} place${s.left > 1 ? "s" : ""} left · free` : "Full"}</span>
                  </button>
                ))}
                {!c.slots?.length && <EmptySlots />}
              </div>
              <div className="sticky-cta mt-3">
                <a
                  href="#book"
                  className="block rounded-xl bg-proof-600 px-4 py-4 text-center text-[18px] font-bold text-white"
                >
                  Book a free viewing
                </a>
              </div>
            </>
          )}
          <a
            href="/report"
            className="mt-2 block min-h-[48px] py-3 text-center text-[16px] text-sky-500"
          >
            Something looks wrong? Tell us
          </a>
          <HelpFooter contact={c.agency?.contact} />
        </div>
      </div>
    </main>
  );
}
