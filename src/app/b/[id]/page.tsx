import { headers } from "next/headers";
import CancelButton from "./cancel-button";
import { HelpFooter, OfflineNote } from "@/components/human";

async function getPass(id: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const res = await fetch(`${proto}://${host}/api/bookings/${id}`, {
    cache: "no-store",
  }).catch(() => null);
  return res?.ok ? res.json() : null;
}

// PWA caches this page offline (next-pwa runtime cache). Code itself arrives
// via WhatsApp — page never renders the code, only its expiry + details.
export default async function ViewingPassPage({ params }: { params: { id: string } }) {
  const data = await getPass(params.id);
  const pass = data?.pass;
  if (!pass)
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-[26px] font-bold">Can&apos;t find this pass</h1>
        <p className="mt-2 text-[16px]">
          The link may be old. Open your WhatsApp confirmation message again —
          the newest link is the right one.
        </p>
        <HelpFooter />
      </main>
    );

  return (
    <main className="mx-auto max-w-md px-4 pb-10 pt-6">
      <div className="rounded-2xl bg-white p-5 text-center">
        <p className="text-[16px] font-bold text-proof-600">
          {pass.status === "Confirmed" ? "🎉 You&apos;re booked!" : `Status: ${pass.status}`}
        </p>
        <h1 className="mt-2 text-[22px] font-bold leading-snug">{pass.listing}</h1>
        <p className="mt-1 text-[16px]">{pass.area}</p>
        <p className="tabular mt-2 text-[18px] font-semibold">
          {new Date(pass.startsAt).toLocaleString()}
        </p>
        {pass.host && (
          <p className="mt-2 text-[16px]">
            You&apos;ll meet <span className="font-bold">{pass.host}</span> · {pass.agency}
          </p>
        )}
        <div className="mt-4 rounded-xl bg-sun-100 p-4 text-[16px]">
          <p className="font-bold">Your 6-digit code is on WhatsApp</p>
          <p className="mt-1">
            Show it to {pass.host ?? "your host"} at the venue.
            {pass.otpExpires && <> It expires around {new Date(pass.otpExpires).toLocaleTimeString()} — come on time.</>}
          </p>
        </div>
        <div className="sticky-cta mt-4 grid grid-cols-1 gap-2">
          <button className="w-full rounded-xl bg-sand-100 px-3 py-4 text-[16px] font-bold">
            Add to calendar
          </button>
          <CancelButton bookingId={pass.id} />
        </div>
        <OfflineNote />
        <HelpFooter contact={pass.contact} />
      </div>
    </main>
  );
}
