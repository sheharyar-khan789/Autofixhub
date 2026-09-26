import { ROLES, type Role } from "@/lib/models";

export type StaffClaims = Record<string, unknown>;

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}

/**
 * Pure authorisation check. A user with no `role` claim, an unknown role, or a
 * different `businessId` has no access, whatever else is true of the account.
 */
export function hasRole(
  claims: StaffClaims | null | undefined,
  allowed: readonly Role[],
  expectedBusinessId: string,
): boolean {
  if (!claims) return false;
  if (!isRole(claims.role)) return false;
  if (claims.businessId !== expectedBusinessId) return false;
  return allowed.includes(claims.role);
}

/**
 * Only same-site admin paths are accepted as a post-login destination, so the `next`
 * parameter can never be used as an open redirect.
 */
export function safeAdminNext(next: unknown): string {
  if (typeof next !== "string") return "/admin";
  if (!next.startsWith("/admin") || next.startsWith("//") || next.includes("\\") || next.startsWith("/admin/login")) {
    return "/admin";
  }
  return next;
}
