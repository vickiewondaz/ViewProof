import Link from "next/link";

// Responsive shell: compact brand bar on phones, full nav on sm+.
export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-sand-100/90 backdrop-blur">
      <div className="mx-auto flex min-h-[60px] w-full max-w-6xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex min-h-[48px] items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-proof-600 text-[18px] font-bold text-white">
            V
          </span>
          <span className="text-[18px] font-bold">ViewProof</span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
          <Link href="/dashboard" className="rounded-lg px-3 py-2 text-[16px] font-semibold hover:bg-white">
            Dashboard
          </Link>
          <Link href="/agent" className="rounded-lg px-3 py-2 text-[16px] font-semibold hover:bg-white">
            Agent
          </Link>
          <Link href="/review" className="rounded-lg px-3 py-2 text-[16px] font-semibold hover:bg-white">
            Review
          </Link>
          <Link
            href="/login"
            className="ml-1 rounded-xl bg-proof-600 px-4 py-2 text-[16px] font-bold text-white"
          >
            Sign in
          </Link>
        </nav>
        {/* Phones: one thumb-sized entry point; full nav lives on task screens. */}
        <Link
          href="/login"
          className="rounded-xl bg-proof-600 px-4 py-2 text-[16px] font-bold text-white sm:hidden"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}
