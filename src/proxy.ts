import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api/auth/login).*)"],
};

/**
 * Reading is public. Anyone can browse the catalog, games, and search
 * results. Anything that writes (saving/editing/deleting, connecting BGG,
 * running a Discover search that spends API quota, unfurling a URL server
 * side) needs the owner's session.
 */
export async function proxy(request: NextRequest) {
  if (request.method === "GET" || request.method === "HEAD") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await isValidSessionToken(token)) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return Response.json({ error: "Connect to BoardGameGeek to add or save." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
