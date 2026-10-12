import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <p className="text-xs font-semibold tracking-wide text-proof-600">
        VIEWPROOF MVP 1.1
      </p>
      <h1 className="mt-2 text-[32px] font-bold leading-tight">
        Accountable property viewings
      </h1>
      <p className="mt-3 text-base">
        Clear information creates confident viewings. Share a Viewing Card,
        book on WhatsApp, check in with a code, keep the receipt.
      </p>
      <div className="mt-6 grid gap-3">
        <Link
          href="/dashboard"
          className="rounded-xl bg-proof-600 px-4 py-3 text-center text-white"
        >
          Owner dashboard
        </Link>
        <Link
          href="/agent"
          className="rounded-xl bg-white px-4 py-3 text-center font-semibold"
        >
          Agent check-in
        </Link>
      </div>
      <p className="mt-6 text-sm text-slate-500">
        ViewProof does not verify title or ownership. It shows what the agency
        confirmed, when, and who is accountable.
      </p>
    </main>
  );
}
