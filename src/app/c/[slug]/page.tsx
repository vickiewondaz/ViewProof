import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { CheckCircle2, Award, Sprout, ShieldAlert, CalendarCheck } from "lucide-react";
import { HelpFooter, PausedNotice } from "@/components/human";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
        <Card>
          <CardContent className="text-center">
            <h1 className="font-display text-[32px] font-bold">Hmm, this card is gone</h1>
            <p className="mt-2 text-[16px]">
              The agency may have paused or removed this listing. Nothing was taken
              from you — bookings here are always free.
            </p>
            <Button asChild size="lg" className="mt-4 w-full">
              <Link href="/">Back home</Link>
            </Button>
            <HelpFooter />
          </CardContent>
        </Card>
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-10 pt-6">
      {/* Phones: gallery over details. Desktop: gallery left, booking panel right. */}
      <Card className="grid gap-0 overflow-hidden md:grid-cols-[1.25fr_1fr]">
        <div className="relative">
          {c.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.images[0]}
              alt={`${c.title}, ${c.area}`}
              className="h-64 w-full object-cover md:h-full md:min-h-[480px]"
              loading="eager"
            />
          ) : (
            <div className="photo-fallback flex h-56 flex-col items-center justify-center gap-2 px-6 text-center md:h-full md:min-h-[480px]">
              <span className="font-display text-[54px] font-bold leading-none">{c.title.charAt(0)}</span>
              <p className="max-w-[26ch] text-[16px] opacity-90">
                Photos coming — the agency hasn&apos;t added clear pictures yet.
              </p>
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {c.paused ? (
              <Badge variant="warn"><ShieldAlert />Paused</Badge>
            ) : (
              <Badge variant="confirmed"><CalendarCheck />Bookable</Badge>
            )}
          </div>
        </div>
        <CardContent>
          <p className="eyebrow">{c.area}</p>
          <h1 className="font-display mt-1 text-[30px] font-bold leading-[1.05] md:text-[36px]">{c.title}</h1>
          <p className="tabular mt-2 text-[26px] font-bold tracking-tight">
            {c.currency} {Number(c.price).toLocaleString()}
            <span className="ml-2 inline-block h-[3px] w-10 translate-y-[-6px] rounded-full bg-brass-500" aria-hidden="true" />
          </p>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Evidence status">
            <Badge variant="confirmed">
              <CheckCircle2 />
              Fresh {new Date(c.lastConfirmedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </Badge>
            {c.host && (
              <Badge variant="confirmed">
                <CheckCircle2 />
                Meet {c.host}
              </Badge>
            )}
            {c.fresh?.score !== null && c.fresh?.score !== undefined ? (
              <Badge variant="score">
                <Award />
                {c.fresh.badge}
              </Badge>
            ) : (
              <Badge variant="neutral">
                <Sprout />
                New agency — earning its score
              </Badge>
            )}
          </div>
          <details className="mt-2 text-[14px] text-clay">
            <summary className="min-h-[44px] cursor-pointer py-2 text-[16px] font-semibold">More about this card</summary>
            <ul className="grid gap-1 pb-2">
              {c.photographedAt && (
                <li>Pictures taken {new Date(c.photographedAt).toDateString()}.</li>
              )}
              <li>Hosted by {c.agency?.name}. Title and ownership not checked by ViewProof.</li>
              <li>Based on {c.fresh?.viewings ?? 0} counted viewings.</li>
            </ul>
          </details>
          {c.paused ? (
            <PausedNotice contact={c.agency?.contact} title={c.title} area={c.area} />
          ) : (
            <div id="book">
              <BookForm listingId={c.id} slots={c.slots ?? []} contact={c.agency?.contact} />
            </div>
          )}
          <Button variant="ghost" asChild className="mt-1 w-full">
            <a href={`/report?listing=${c.id}`}>Something looks wrong? Tell us</a>
          </Button>
          <AskBox slug={c.slug} />
          <HelpFooter contact={c.agency?.contact} />
        </CardContent>
      </Card>
    </main>
  );
}
