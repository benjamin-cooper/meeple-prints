import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api/auth/login).*)"],
};

/**
 * Reading requires the owner's session, same as writing. The only public
 * paths are the general print-search tool (not tied to the owner's
 * collection), the session-check endpoint Nav polls to decide whether to
 * show "Sign in", and the cron scan route, which authenticates itself via
 * a bearer secret instead of a browser session (see src/app/api/cron/scan).
 */
const PUBLIC_PATHS = ["/search", "/api/public-search", "/api/auth/session", "/api/cron/scan"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await isValidSessionToken(token)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "Connect to BoardGameGeek to add or save." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}
