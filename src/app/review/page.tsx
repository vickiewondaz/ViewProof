export default function ReviewPage() {
  // TODO Phase 4-5: needs-review triage for conflicts, issues, duplicates.
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-[26px] font-bold">Needs review</h1>
      <p className="mt-1 text-sm">
        Conflicts, stale flags, and buyer reports. Human decision only — no
        automatic enforcement.
      </p>
    </main>
  );
}
