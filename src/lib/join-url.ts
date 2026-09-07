/**
 * The team-facing join link the host desk shows as a QR code. `/play` reads
 * the `code` parameter back with `readJoinCode` to prefill the session-code
 * field, so a scan lands a team one tap from joining.
 */
export function buildJoinUrl(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, "")}/play?code=${encodeURIComponent(code)}`;
}

/**
 * Reads `?code=` out of a query string and applies the same sanitising as
 * the join form's input (uppercase, join-code alphabet only, five chars),
 * so a prefilled value is always one the form would accept.
 */
export function readJoinCode(search: string): string {
  const raw = new URLSearchParams(search).get("code") ?? "";
  const cleaned = raw.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 5);
  return cleaned.length === 5 ? cleaned : "";
}
