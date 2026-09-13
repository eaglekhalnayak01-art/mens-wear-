import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge guard for the dashboard.
 *
 * This is a fast first pass, not the security boundary: it only looks at whether an
 * admin session cookie is present, so an unauthenticated visitor is redirected
 * before the dashboard bundle is even built. Every admin page also calls
 * `requireAdminPage()` on the server, and every admin API route verifies the session
 * and the origin again — a forged cookie cannot be minted here because nothing in
 * this file can read or create one.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";
  const hasSession = request.cookies.has("amw_admin");

  if (isLoginPage) {
    if (hasSession) {
      const target = new URL("/admin", request.nextUrl);
      return NextResponse.redirect(target);
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/admin")) return NextResponse.next();

  if (!hasSession) {
    const target = new URL("/admin/login", request.nextUrl);
    target.searchParams.set("next", `${pathname}${search}`);
    const response = NextResponse.redirect(target);
    // Never let a half-rendered dashboard be cached by a shared browser.
    response.headers.set("cache-control", "no-store, max-age=0");
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("x-frame-options", "SAMEORIGIN");
  response.headers.set("referrer-policy", "same-origin");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
