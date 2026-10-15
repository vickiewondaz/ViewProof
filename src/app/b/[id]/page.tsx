import { headers } from "next/headers";
import { PartyPopper, KeyRound } from "lucide-react";
import CancelButton from "./cancel-button";
import CalendarButton from "./calendar-button";
import { HelpFooter, OfflineNote } from "@/components/human";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
      <main className="mx-auto max-w-md md:max-w-lg px-4 py-10">
        <Card>
          <CardContent className="text-center">
            <h1 className="font-display text-[32px] font-bold">Can&apos;t find this pass</h1>
            <p className="mt-2 text-[16px]">
              The link may be old. Open your WhatsApp confirmation message again —
              the newest link is the right one.
            </p>
            <HelpFooter />
          </CardContent>
        </Card>
      </main>
    );

  return (
    <main className="mx-auto max-w-md md:max-w-lg px-4 pb-10 pt-6">
      <Card className="overflow-hidden !p-0">
        <div className="pine-band px-5 pb-5 pt-6 text-center md:px-7">
          <Badge variant={pass.status === "Confirmed" ? "confirmed" : "neutral"}>
            <PartyPopper />
            {pass.status === "Confirmed" ? "You're booked!" : `Status: ${pass.status}`}
          </Badge>
          <h1 className="font-display font-display mt-3 text-[32px] font-bold leading-tight">{pass.listing}</h1>
          <p className="mt-1 text-[16px] opacity-80">{pass.area}</p>
          <p className="tabular mt-2 text-[20px] font-bold text-brass-100">
            {new Date(pass.startsAt).toLocaleString()}
          </p>
          {pass.host && (
            <p className="mt-2 text-[16px] opacity-90">
              You&apos;ll meet <span className="font-bold">{pass.host}</span> · {pass.agency}
            </p>
          )}
        </div>
        <CardContent className="text-center">
          <div className="mt-1 rounded-2xl border border-dashed border-brass-600/50 bg-brass-100 p-4 text-[16px]">
            <p className="flex items-center justify-center gap-2 font-bold">
              <KeyRound /> Code is on WhatsApp — show it at the venue.
            </p>
            {pass.otpExpires && <p className="mt-1">Expires ~{new Date(pass.otpExpires).toLocaleTimeString()} — come on time.</p>}
          </div>
          <div className="sticky-cta mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 md:static md:bg-none md:pb-0">
            <CalendarButton pass={{ id: pass.id, listing: pass.listing, area: pass.area, startsAt: pass.startsAt, agency: pass.agency, host: pass.host }} />
            <CancelButton bookingId={pass.id} />
          </div>
          <Button variant="ghost" asChild className="mt-1 w-full">
            <a href={`/report?listing=${pass.listingId}&booking=${pass.id}`}>
              Something was off? Report it
            </a>
          </Button>
          <OfflineNote />
          <HelpFooter contact={pass.contact} />
        </CardContent>
      </Card>
    </main>
  );
}
