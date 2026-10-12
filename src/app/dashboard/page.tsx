export default function DashboardPage() {
  // TODO Phase 5: owner scorecard, stale queue, issues inbox, weekly report.
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-[26px] font-bold">Owner dashboard</h1>
      <div className="mt-4 grid gap-3">
        <section className="rounded-2xl bg-white p-4">
          <h2 className="text-base font-semibold">Stale queue</h2>
          <p className="text-sm">Auto-paused listings awaiting reconfirm.</p>
        </section>
        <section className="rounded-2xl bg-white p-4">
          <h2 className="text-base font-semibold">Today&apos;s viewings</h2>
          <p className="text-sm">Requested / confirmed / completed.</p>
        </section>
        <section className="rounded-2xl bg-white p-4">
          <h2 className="text-base font-semibold">Agent scorecard</h2>
          <p className="text-sm">Attended % · response mins · mismatches.</p>
        </section>
      </div>
    </main>
  );
}
