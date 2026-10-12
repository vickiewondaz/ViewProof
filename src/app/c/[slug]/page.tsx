import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";

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
        <h1 className="text-[26px] font-bold">Card not found</h1>
        <p className="mt-2 text-sm">
          This listing is unavailable, archived, or still a draft.{" "}
          <Link href="/" className="text-sky-500">Back home</Link>
        </p>
      </main>
    );

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="overflow-hidden rounded-2xl bg-white">
        {c.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.images[0]} alt={`${c.title}`} className="h-52 w-full object-cover" />
        ) : (
          <div className="flex h-40 items-center justify-center bg-sand-100 text-sm">
            Photos pending — awaiting agency confirmation
          </div>
        )}
        <div className="p-4">
          <h1 className="text-[26px] font-bold leading-tight">{c.title}</h1>
          <p className="text-sm">{c.area}</p>
          <p className="tabular mt-2 text-base font-semibold">
            {c.currency} {Number(c.price).toLocaleString()}
          </p>
          <div className="mt-3 grid gap-1 text-sm">
            <p>✓ Listing refreshed {new Date(c.lastConfirmedAt).toDateString()}</p>
            <p>✓ Hosted by {c.agency?.name}</p>
            {c.host && <p>✓ Your host: {c.host}</p>}
            {c.photographedAt && (
              <p>✓ Photographed on {new Date(c.photographedAt).toDateString()}</p>
            )}
            <p>ⓘ Title and ownership not checked by ViewProof</p>
          </div>
          {c.paused ? (
            <div className="mt-4 rounded-xl bg-slate-200/60 p-3 text-sm">
              Paused — awaiting agency reconfirmation.
              <button className="mt-2 w-full rounded-xl bg-white px-4 py-3 font-semibold">
                Notify me when fresh
              </button>
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-2" id="book">
                {(c.slots ?? []).slice(0, 6).map((s: { id: string; startsAt: string; left: number }) => (
                  <button
                    key={s.id}
                    disabled={s.left <= 0}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm disabled:opacity-50"
                  >
                    {new Date(s.startsAt).toLocaleString()} · {s.left} left
                  </button>
                ))}
                {!c.slots?.length && (
                  <p className="text-sm">No free slots yet — check back or ask the agency.</p>
                )}
              </div>
              <a
                href="#book"
                className="mt-3 block rounded-xl bg-proof-600 px-4 py-3 text-center text-white"
              >
                Book a free viewing
              </a>
            </>
          )}
          <a href="#report" className="mt-2 block text-center text-sm text-sky-500">
            Report an issue
          </a>
        </div>
      </div>
    </main>
  );
}
