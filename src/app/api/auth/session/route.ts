import { NextResponse } from "next/server";
import { hasRole } from "@/lib/auth/roles";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { businessId, isNotConfigured } from "@/lib/env";
import { getAdminAuth } from "@/lib/firebase/admin";
import { logServerError } from "@/lib/logger";
import { ROLES } from "@/lib/models";
import { isSameOrigin } from "@/lib/security/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/** Exchanges a fresh Firebase ID token for an httpOnly session cookie (staff only). */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, message: "Request origin not allowed." }, { status: 403, headers: noStore });
  }
  let idToken: unknown;
  try {
    idToken = (await req.json())?.idToken;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400, headers: noStore });
  }
  if (typeof idToken !== "string" || idToken.length < 20 || idToken.length > 4096) {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400, headers: noStore });
  }

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    // Only accept tokens minted in the last 5 minutes (recent sign-in).
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
      return NextResponse.json({ ok: false, message: "Sign in again." }, { status: 401, headers: noStore });
    }
    if (!hasRole(decoded, ROLES, businessId())) {
      // Authenticated but not staff: no session, no hint about why.
      return NextResponse.json({ ok: false, message: "This account does not have access." }, { status: 403, headers: noStore });
    }
    const cookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_SECONDS * 1000 });
    const res = NextResponse.json({ ok: true }, { headers: noStore });
    res.cookies.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (err) {
    if (isNotConfigured(err)) {
      logServerError("auth.session.not-configured", err);
      return NextResponse.json({ ok: false, message: "Sign-in is not configured on this server." }, { status: 503, headers: noStore });
    }
    const code = (err as { code?: string }).code ?? "";
    if (code.startsWith("auth/")) {
      return NextResponse.json({ ok: false, message: "Sign in failed. Try again." }, { status: 401, headers: noStore });
    }
    logServerError("auth.session.create", err);
    return NextResponse.json({ ok: false, message: "Something went wrong. Try again." }, { status: 500, headers: noStore });
  }
}

export async function DELETE(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, message: "Request origin not allowed." }, { status: 403, headers: noStore });
  }
  // Revoke server-side too, so a copy of the cookie stops working immediately
  // (verifySessionCookie(…, true) checks revocation) instead of living out its 8 hours.
  const cookie = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (cookie) {
    try {
      const auth = getAdminAuth();
      const decoded = await auth.verifySessionCookie(decodeURIComponent(cookie));
      await auth.revokeRefreshTokens(decoded.sub);
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      // An already-invalid cookie has nothing to revoke; anything else is worth knowing about.
      if (!code.startsWith("auth/") && !isNotConfigured(err)) logServerError("auth.session.revoke", err);
    }
  }
  const res = NextResponse.json({ ok: true }, { headers: noStore });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
