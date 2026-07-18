import { unfurlUrl } from "@/lib/unfurl";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { url } = await request.json();
  if (!url || typeof url !== "string") {
    return Response.json({ error: "A URL is required." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Response.json({ error: "That doesn't look like a valid URL." }, { status: 400 });
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return Response.json({ error: "Only http/https links are supported." }, { status: 400 });
  }

  try {
    const preview = await unfurlUrl(url);
    return Response.json(preview);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
