// Stale + evidence helpers (PRD 7.2/7.3, Thinking §§4/13).
// Stale = lastConfirmedAt + refreshIntervalDays exceeded → StalePaused (unbookable).

export function isStale(lastConfirmedAt: Date, intervalDays: number): boolean {
  return Date.now() - lastConfirmedAt.getTime() > intervalDays * 24 * 60 * 60 * 1000;
}

export type EvidenceLabel =
  | "Agency identity checked"
  | "Agent assigned"
  | "Listing refreshed on [date]"
  | "Photographed on [date]"
  | "Access evidence submitted"
  | "Needs confirmation"
  | "Title and ownership not checked by ViewProof";

export function buildEvidence(input: {
  agentName?: string | null;
  lastConfirmedAt: Date;
  photographedAt?: Date | null;
  accessRef?: string | null;
  status: string;
}): { label: EvidenceLabel; detail: string }[] {
  const out: { label: EvidenceLabel; detail: string }[] = [];
  out.push({
    label: "Agency identity checked",
    detail: "This viewing is hosted by the listed agency.",
  });
  if (input.agentName)
    out.push({ label: "Agent assigned", detail: `Your host is ${input.agentName}.` });
  out.push({
    label: "Listing refreshed on [date]",
    detail: `The agency last confirmed this listing on ${input.lastConfirmedAt.toDateString()}.`,
  });
  if (input.photographedAt)
    out.push({
      label: "Photographed on [date]",
      detail: `Photos taken on ${input.photographedAt.toDateString()}.`,
    });
  if (input.accessRef)
    out.push({
      label: "Access evidence submitted",
      detail: "The agency submitted access evidence for this viewing.",
    });
  if (input.status === "NeedsReview" || input.status === "StalePaused")
    out.push({
      label: "Needs confirmation",
      detail: "This detail is being confirmed by the agency.",
    });
  out.push({
    label: "Title and ownership not checked by ViewProof",
    detail: "ViewProof does not verify title or ownership.",
  });
  return out;
}
