import { prisma } from "@/lib/prisma";
import { getProviderCredentials } from "@/lib/providers/env-credentials";

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  const creds = getProviderCredentials();

  return Response.json({
    connected: !!settings?.bggSessionId,
    bggUsername: settings?.bggUsername ?? null,
    lastCollectionSync: settings?.lastCollectionSync ?? null,
    hasThingiverseToken: !!creds.thingiverseToken,
    hasCultsCredentials: !!creds.cultsUsername && !!creds.cultsApiKey,
    hasEtsyApiKey: !!creds.etsyKeystring && !!creds.etsySharedSecret,
  });
}
