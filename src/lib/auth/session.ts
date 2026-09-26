import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { businessId } from "@/lib/env";
import { getAdminAuth } from "@/lib/firebase/admin";
import { logServerError } from "@/lib/logger";
import { ROLES, type Role } from "@/lib/models";
import { hasRole, isRole } from "./roles";

export const SESSION_COOKIE = "admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

export interface StaffSession {
  uid: string;
  email: string | undefined;
  role: Role;
}

/**
 * Decodes + verifies the raw session cookie once per request (Phase 3 added
 * more than one `requireRole` call per admin request — a nested layout and
 * the page itself — so this is memoised with React's `cache()` to avoid a
 * second `verifySessionCookie` round-trip to Firebase Auth for the same request).
 */
const verifyCookie = cache(async (cookie: string) => {
  try {
    return await getAdminAuth().verifySessionCookie(cookie, true);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (!code?.startsWith("auth/")) logServerError("auth.verify-session", err);
    return null;
  }
});

/** Verifies the session cookie (checking revocation). Returns null when absent/invalid. */
export async function getStaffSession(
  allowed: readonly Role[] = ROLES,
): Promise<StaffSession | null> {
  const jar = await cookies();
  const cookie = jar.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  const decoded = await verifyCookie(cookie);
  if (!decoded) return null;
  if (!hasRole(decoded, allowed, businessId()) || !isRole(decoded.role)) return null;
  return { uid: decoded.uid, email: decoded.email, role: decoded.role };
}

/** Use at the top of admin pages, layouts, actions and route handlers. */
export async function requireRole(allowed: readonly Role[] = ROLES): Promise<StaffSession> {
  const session = await getStaffSession(allowed);
  if (session) return session;
  // Signed-in staff without this area's role: back to the dashboard with an explanation,
  // never the sign-in form (which would look like a failed or expired login).
  if (allowed !== ROLES && (await getStaffSession(ROLES))) redirect("/admin?notice=forbidden");
  // A cookie that no longer verifies (expired, revoked, or role removed): say so.
  const hadCookie = Boolean((await cookies()).get(SESSION_COOKIE)?.value);
  redirect(hadCookie ? "/admin/login?reason=expired" : "/admin/login");
}

