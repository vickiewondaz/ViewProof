import Link from "next/link";
import { Button } from "./ui/button";

// Estate-header shell: solid ivory bar, serif wordmark, hairline below.
// Full nav on sm+; phones get one thumb-sized entry point.
export default function SiteHeader() {
  return (
    <div className="sticky top-0 z-40 border-b border-line bg-cream/95 backdrop-blur-sm">
      <header className="mx-auto flex min-h-[68px] w-full max-w-6xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex min-h-[48px] items-center gap-2.5" aria-label="ViewProof home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ViewProof" className="h-10 w-auto" />
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
          <Link href="/dashboard" className="min-h-[48px] rounded-xl px-4 py-3 text-[16px] font-semibold hover:bg-cream-deep">
            Dashboard
          </Link>
          <Link href="/agent" className="min-h-[48px] rounded-xl px-4 py-3 text-[16px] font-semibold hover:bg-cream-deep">
            Agent
          </Link>
          <Link href="/review" className="min-h-[48px] rounded-xl px-4 py-3 text-[16px] font-semibold hover:bg-cream-deep">
            Review
          </Link>
          <Button asChild size="sm" className="ml-2"><Link href="/login">Sign in</Link></Button>
        </nav>
        <Button asChild size="sm" className="sm:hidden"><Link href="/login">Sign in</Link></Button>
      </header>
    </div>
  );
}
