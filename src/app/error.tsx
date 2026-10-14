"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Something broke — say so kindly, offer a way back, never a stack trace.
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 md:max-w-lg">
      <div className="glass rounded-2xl p-6 text-center">
        <p className="text-[48px]">🛠</p>
        <h1 className="font-display mt-2 text-[32px] font-bold">That hiccuped</h1>
        <p className="mt-2 text-[16px]">
          Something glitched on our side. Nothing you did was lost — bookings and codes are safe.
        </p>
        <div className="mt-4 grid gap-2">
          <Button onClick={reset} size="lg" className="w-full">
            Try again
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
