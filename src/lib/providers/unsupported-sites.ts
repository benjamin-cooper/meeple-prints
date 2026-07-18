/**
 * Sites with no automatic search wired up, kept in their own file (no
 * server-only imports) so client components can show them without pulling
 * in provider implementations that use Node-only APIs.
 */
export const UNSUPPORTED_SITES: Array<{ label: string; reason: string }> = [
  { label: "MakerWorld", reason: "Its search API rejects requests that don't come from a browser session." },
  { label: "MyMiniFactory", reason: "Its API requires a full OAuth login, not just an API key." },
];
