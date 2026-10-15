import { headers } from "next/headers";
import { auth } from "./auth";

// Landlord's gate: the path to shop power (lock/unlock agencies, bans).
// - role "admin" — granted by the superadmin in /superadmin, revocable.
// - Email allowlist (ADMIN_EMAILS) — bootstrap access, same power.
// Superadmin is deliberately NOT included: creator ≠ landlord.
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return adminEmails().includes(email.trim().toLowerCase());
}

export async function requirePlatformAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user as { id: string; email: string; role?: string | null } | undefined;
  if (!u) return { ok: false as const, status: 401 };
  if (u.role === "admin" || isAdminEmail(u.email)) return { ok: true as const, user: u };
  return { ok: false as const, status: 403 };
}

// Creator's gate: role "superadmin" ONLY. No allowlist, no plugin path,
// no UI path — assigned out-of-band (DB/CLI by the creator, i.e. here).
// The creator manages who is landlord, but never acts as one.
export async function requireSuperAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user as { id: string; email: string; role?: string | null } | undefined;
  if (!u) return { ok: false as const, status: 401 };
  if (u.role === "superadmin") return { ok: true as const, user: u };
  return { ok: false as const, status: 403 };
}
