/**
 * POST /api/auth/login
 * The site's only account is the one BGG username in OWNER_BGG_USERNAME.
 * A successful login proves the caller knows that real BGG password (BGG
 * does the verification, not us) and also connects BGG collection sync,
 * so there's only one login to do.
 */
import { bggLogin } from "@/lib/bgg";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { isRateLimited } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`login:${ip}`)) {
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const { username, password } = await request.json();
  if (!username || !password) {
    return Response.json({ error: "Username and password are required." }, { status: 400 });
  }

  const owner = process.env.OWNER_BGG_USERNAME;
  const genericError = Response.json({ error: "Invalid username or password." }, { status: 401 });
  if (!owner || username.trim().toLowerCase() !== owner.toLowerCase()) {
    return genericError;
  }

  try {
    const cookieJar = await bggLogin(username.trim(), password);

    await prisma.settings.upsert({
      where: { id: "singleton" },
      update: { bggUsername: username.trim(), bggSessionId: cookieJar },
      create: { id: "singleton", bggUsername: username.trim(), bggSessionId: cookieJar },
    });

    const token = await createSessionToken();
    const res = Response.json({ ok: true });
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`
    );
    return res;
  } catch {
    return genericError;
  }
}
