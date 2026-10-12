import { headers } from "next/headers";
import { auth } from "./auth";

export type StaffUser = {
  id: string;
  email: string;
  role?: string | null;
  agencyId?: string | null;
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
