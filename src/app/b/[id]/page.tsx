export default function ViewingPassPage({
  params,
}: {
  params: { id: string };
}) {
  // TODO Phase 3: fetch booking, cache offline via PWA.
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="rounded-2xl bg-white p-5 text-center">
        <p className="text-sm font-semibold text-proof-600">
          Your viewing is confirmed
        </p>
        <p className="tabular mt-3 text-[32px] font-bold tracking-widest">
          _ _ _ _ _ _
        </p>
        <p className="mt-1 text-sm">Booking {params.id} · meeting code</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="rounded-xl bg-sand-100 px-3 py-3 text-sm font-semibold">
            Add to calendar
          </button>
          <button className="rounded-xl bg-sand-100 px-3 py-3 text-sm font-semibold">
            Need help?
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Saved offline in the PWA. We&apos;ll sync when you&apos;re back
          online.
        </p>
      </div>
    </main>
  );
}
