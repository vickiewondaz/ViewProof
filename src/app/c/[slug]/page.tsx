import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { HelpFooter, PausedNotice } from "@/components/human";
import BookForm from "@/components/book-form";
import AskBox from "@/components/ask-box";

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
    <main className="mx-auto w-full max-w-5xl px-4 pb-10 pt-6">
      {/* Phones: gallery over details. Desktop: gallery left, booking panel right. */}
      <div className="grid gap-4 overflow-hidden glass rounded-2xl md:grid-cols-[1.25fr_1fr]">
        <div>
          {c.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.images[0]}
              alt={`${c.title}, ${c.area}`}
              className="h-52 w-full object-cover md:h-full md:min-h-[420px]"
              loading="eager"
            />
          ) : (
            <div className="flex h-40 items-center justify-center bg-sand-100 px-4 text-center text-[16px] md:h-full md:min-h-[420px]">
              Photos coming — the agency hasn&apos;t added clear pictures yet.
            </div>
          )}
        </div>
        <div className="p-4 md:p-6">
          <h1 className="text-[26px] font-bold leading-tight">{c.title}</h1>
          <p className="mt-1 text-[16px]">{c.area}</p>
          <p className="tabular mt-2 text-[20px] font-bold">
            {c.currency} {Number(c.price).toLocaleString()}
          </p>
          <ul className="mt-3 grid gap-2 text-[16px]">
            <li>✓ Confirmed fresh: {new Date(c.lastConfirmedAt).toDateString()}</li>
            <li>✓ Hosted by {c.agency?.name}</li>
            {c.host && <li>✓ You&apos;ll meet: {c.host}</li>}
            {c.fresh?.score !== null && c.fresh?.score !== undefined && (
              <li>🏅 {c.agency?.name} · {c.fresh.badge} ({c.fresh.viewings} viewings counted)</li>
            )}
            {c.fresh && (c.fresh.score === null || c.fresh.score === undefined) && (
              <li>🌱 {c.agency?.name} is new here — {c.fresh.badge}</li>
            )}
            {c.photographedAt && (
              <li>✓ Pictures taken: {new Date(c.photographedAt).toDateString()}</li>
            )}
            <li>ⓘ We don&apos;t check title or ownership — ask the agency how they confirm it.</li>
          </ul>
          {c.paused ? (
            <PausedNotice contact={c.agency?.contact} title={c.title} area={c.area} />
          ) : (
            <div id="book">
              <BookForm listingId={c.id} slots={c.slots ?? []} contact={c.agency?.contact} />
            </div>
          )}
          <a
            href="/report"
            className="mt-2 block min-h-[48px] py-3 text-center text-[16px] text-sky-500"
          >
            Something looks wrong? Tell us
          </a>
          <AskBox slug={c.slug} />
          <HelpFooter contact={c.agency?.contact} />
        </div>
      </div>
    </main>
  );
}
