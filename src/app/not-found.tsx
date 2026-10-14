import Link from "next/link";
import { HelpFooter } from "@/components/human";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 md:max-w-lg">
      <div className="glass rounded-2xl p-6 text-center">
        <p className="text-[48px]">🧭</p>
        <h1 className="font-display mt-2 text-[32px] font-bold">Lost your way?</h1>
        <p className="mt-2 text-[16px]">
          This page moved or never existed. Your bookings are safe — nothing
          was cancelled.
        </p>
        <Link
          href="/"
          className="mt-4 block rounded-xl bg-proof-600 px-4 py-4 text-[18px] font-bold text-white"
        >
          Back home
        </Link>
        <HelpFooter />
      </div>
    </main>
  );
}
