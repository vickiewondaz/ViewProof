"use client";

// Something broke — say so kindly, offer a way back, never a stack trace.
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 md:max-w-lg">
      <div className="glass rounded-2xl p-6 text-center">
        <p className="text-[48px]">🛠</p>
        <h1 className="mt-2 text-[26px] font-bold">That hiccuped</h1>
        <p className="mt-2 text-[16px]">
          Something glitched on our side. Nothing you did was lost — bookings and codes are safe.
        </p>
        <div className="mt-4 grid gap-2">
          <button
            onClick={reset}
            className="w-full rounded-xl bg-proof-600 px-4 py-4 text-[18px] font-bold text-white"
          >
            Try again
          </button>
          <a
            href="/"
            className="glass-soft block w-full rounded-xl px-4 py-4 text-center text-[16px] font-semibold"
          >
            Back home
          </a>
        </div>
      </div>
    </main>
  );
}
