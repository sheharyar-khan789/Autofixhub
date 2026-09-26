import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap edge-side gate for /admin: redirects to login when there is no session
 * cookie at all, remembering where the user was going (`next`). This is NOT
 * authorisation: the cookie is cryptographically verified (with revocation check)
 * by requireRole() in Node-runtime server code, because firebase-admin cannot run here.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (!request.cookies.has("admin_session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    if (pathname !== "/admin") url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
