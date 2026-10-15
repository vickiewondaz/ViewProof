"use client";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// Real calendar file — no backend, no account. Downloads a .ics the buyer's
// phone opens in Google/Apple calendar with venue, host, and code reminder.
export default function CalendarButton({ pass }: {
  pass: { id: string; listing: string; area: string; startsAt: string; agency: string; host?: string | null };
}) {
  const add = () => {
    const start = new Date(pass.startsAt);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ViewProof//Viewing//EN", "BEGIN:VEVENT",
      `UID:${pass.id}@viewproof`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:Viewing — ${pass.listing}`,
      `LOCATION:${pass.area}`,
      `DESCRIPTION:Hosted by ${pass.host ?? pass.agency}. Bring your 6-digit meeting code from WhatsApp. Free — no payment before you meet.`,
      "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:Bring your viewing code",
      "END:VALARM", "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "viewproof-viewing.ics";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button variant="secondary" onClick={add}>
      <CalendarPlus /> Add to calendar
    </Button>
  );
}
