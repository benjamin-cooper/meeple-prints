import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return Response.json({ signedIn: await isValidSessionToken(token) });
}
