/**
 * POST /api/bgg/login
 * Logs in to BGG and stores the resulting session on the singleton
 * Settings row. Credentials are never persisted; only the session id is.
 */
import { bggLogin } from "@/lib/bgg";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();
  if (!username || !password) {
    return Response.json({ error: "Username and password are required." }, { status: 400 });
  }

  try {
    const sessionId = await bggLogin(username, password);
    await prisma.settings.upsert({
      where: { id: "singleton" },
      update: { bggUsername: username, bggSessionId: sessionId },
      create: { id: "singleton", bggUsername: username, bggSessionId: sessionId },
    });
    return Response.json({ ok: true, username });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 401 });
  }
}
