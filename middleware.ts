import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "homeease_session";

const PROTECTED_PREFIXES = [
  "/dashboard", "/book", "/requests", "/bookings", "/history", "/favorites",
  "/invoices", "/notifications", "/profile", "/settings", "/provider", "/admin",
];

/**
 * Edge-level gate. This is a convenience redirect only — every page, action and
 * service re-checks the session and the role on the server. Frontend/middleware
 * hiding is never treated as security.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!needsAuth) return NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|manifest.webmanifest).*)"],
};
