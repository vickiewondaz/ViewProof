import { headers } from "next/headers";
import CancelButton from "./cancel-button";

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
        <h1 className="text-[26px] font-bold">Pass not found</h1>
        <p className="mt-2 text-sm">Check your WhatsApp confirmation link.</p>
      </main>
    );

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="rounded-2xl bg-white p-5 text-center">
        <p className="text-sm font-semibold text-proof-600">
          {pass.status === "Confirmed" ? "Your viewing is confirmed" : `Status: ${pass.status}`}
        </p>
        <h1 className="mt-2 text-[20px] font-bold">{pass.listing}</h1>
        <p className="text-sm">{pass.area}</p>
        <p className="tabular mt-2 text-sm">
          {new Date(pass.startsAt).toLocaleString()}
        </p>
        {pass.host && <p className="mt-1 text-sm">Host: {pass.host} · {pass.agency}</p>}
        <div className="mt-3 rounded-xl bg-sun-100 p-3 text-sm">
          Your 6-digit meeting code was sent on WhatsApp.
          {pass.otpExpires && <> Code expires {new Date(pass.otpExpires).toLocaleTimeString()}.</>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="rounded-xl bg-sand-100 px-3 py-3 text-sm font-semibold">
            Add to calendar
          </button>
          <button className="rounded-xl bg-sand-100 px-3 py-3 text-sm font-semibold">
            Need help?
          </button>
        </div>
        <div className="mt-2">
          <CancelButton bookingId={pass.id} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Saved offline in the PWA. Show your WhatsApp code to the agent at the venue.
        </p>
      </div>
    </main>
  );
}
