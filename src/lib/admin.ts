import { headers } from "next/headers";
import { auth } from "./auth";

// Landlord's gate: the ONLY path to platform power.
// - Email allowlist (ADMIN_EMAILS, comma separated) — set by you, in private env.
// - OR role "admin" — grantable only via CLI create-admin or the admin plugin
//   (which itself requires an admin). Nobody can self-promote through the app:
//   agency-create sets owner once, claim sets agent once.
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
