import { headers } from "next/headers";
import { auth } from "./auth";
import { prisma } from "./db";

export type StaffUser = {
  id: string;
  email: string;
  role?: string | null;
  agencyId?: string | null;
  phoneNumber?: string | null;
};

export async function getStaffUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user as StaffUser | undefined;
  if (!u) return null;
  return u;
}

export function isOwner(u: StaffUser | null) {
  return !!u && (u.role === "owner" || u.role === "reviewer" || u.role === "admin");
}

// Agents act only within their agency; owners across agency.
export function agencyScope(u: StaffUser) {
  return u.agencyId ?? "__none__";
}

const digits = (s: string) => s.replace(/\D/g, "");

// Roster match tolerant of +234 / 234 / 0 formats (Nigerian numbers).
export async function findRosterAgent(agencyId: string, phone: string) {
  const mine = digits(phone);
  const variants = new Set([mine]);
  if (mine.startsWith("234")) variants.add(`0${mine.slice(3)}`);
  if (mine.startsWith("0")) variants.add(`234${mine.slice(1)}`);
  return prisma.agent.findFirst({
    where: { agencyId, phone: { in: Array.from(variants) } },
    select: { id: true },
  });
}
