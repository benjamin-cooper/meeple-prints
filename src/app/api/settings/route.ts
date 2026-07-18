import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  return Response.json({
    connected: !!settings?.bggSessionId,
    bggUsername: settings?.bggUsername ?? null,
    lastCollectionSync: settings?.lastCollectionSync ?? null,
    lastGeeklistSync: settings?.lastGeeklistSync ?? null,
    thingiverseToken: settings?.thingiverseToken ?? null,
    cultsUsername: settings?.cultsUsername ?? null,
    cultsApiKey: settings?.cultsApiKey ?? null,
    etsyApiKey: settings?.etsyApiKey ?? null,
  });
}

/** Saves optional per-site search API credentials. Any omitted field is left as-is. */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { thingiverseToken, cultsUsername, cultsApiKey, etsyApiKey } = body ?? {};

  const data: Record<string, string | null> = {};
  if (thingiverseToken !== undefined) data.thingiverseToken = thingiverseToken || null;
  if (cultsUsername !== undefined) data.cultsUsername = cultsUsername || null;
  if (cultsApiKey !== undefined) data.cultsApiKey = cultsApiKey || null;
  if (etsyApiKey !== undefined) data.etsyApiKey = etsyApiKey || null;

  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  return Response.json({
    thingiverseToken: settings.thingiverseToken,
    cultsUsername: settings.cultsUsername,
    cultsApiKey: settings.cultsApiKey,
    etsyApiKey: settings.etsyApiKey,
  });
}
