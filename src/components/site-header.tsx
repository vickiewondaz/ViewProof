import Link from "next/link";
import { Button } from "./ui/button";

// Responsive shell: floating glass pill on all sizes; full nav on sm+.
export default function SiteHeader() {
  return (
    <div className="sticky top-0 z-40 px-3 pt-3">
      <header className="glass-pill mx-auto flex min-h-[60px] w-full max-w-6xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex min-h-[48px] items-center gap-2" aria-label="ViewProof home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-proof-600 text-[18px] font-bold text-white">
            V
          </span>
          <span className="text-[18px] font-bold">ViewProof</span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
          <Link href="/dashboard" className="rounded-full px-3 py-2 text-[16px] font-semibold hover:bg-white/60">
            Dashboard
          </Link>
          <Link href="/agent" className="rounded-full px-3 py-2 text-[16px] font-semibold hover:bg-white/60">
            Agent
          </Link>
          <Link href="/review" className="rounded-full px-3 py-2 text-[16px] font-semibold hover:bg-white/60">
            Review
          </Link>
          <Button asChild size="sm" className="ml-1 rounded-full"><Link href="/login">Sign in</Link></Button>
        </nav>
        {/* Phones: one thumb-sized entry point; full nav lives on task screens. */}
        <Button asChild size="sm" className="rounded-full sm:hidden"><Link href="/login">Sign in</Link></Button>
      </header>
    </div>
  );
}
