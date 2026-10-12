export type Reliability = { attended: number; total: number; label: string };

// Buyer reliability from observed outcomes only. Completed = kept word;
// buyer no-show = broke it. Agent no-shows don't count against the buyer.
export function reliability(attended: number, noShows: number): Reliability {
  const total = attended + noShows;
  if (total === 0) return { attended: 0, total: 0, label: "new buyer — no history yet" };
  if (noShows === 0) return { attended, total, label: `${attended}/${total} attended · always shows up 🌟` };
  return { attended, total, label: `${attended}/${total} attended` };
}
