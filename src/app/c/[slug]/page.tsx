export default function ViewingCardPage({
  params,
}: {
  params: { slug: string };
}) {
  // TODO Phase 2: fetch /api/cards/[slug] (ISR), render evidence + slots.
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="rounded-2xl bg-white p-4">
        <p className="text-xs font-semibold">VIEWING CARD · {params.slug}</p>
        <h1 className="mt-1 text-[26px] font-bold">Listing title + area</h1>
        <p className="mt-2 text-sm">
          ✓ Listing refreshed [date] · ✓ Hosted by [Agency] · ⓘ Title and
          ownership not checked by ViewProof
        </p>
        <a
          href="#book"
          className="mt-4 block rounded-xl bg-proof-600 px-4 py-3 text-center text-white"
        >
          Book a free viewing
        </a>
        <a href="#report" className="mt-2 block text-center text-sm text-sky-500">
          Report an issue
        </a>
      </div>
    </main>
  );
}
