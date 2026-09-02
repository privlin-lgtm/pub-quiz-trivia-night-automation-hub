import { timingSafeEqual } from "node:crypto";

/**
 * Session-control endpoints (advance, score overrides, the host view) must
 * only be usable by whoever created the session, not by anyone who knows
 * the join code — the join code is handed to every team in the room by
 * design, so it can't double as host authority.
 */
export function isValidHostToken(sessionHostToken: string, provided: string | null): boolean {
  if (!provided) return false;
  const expected = Buffer.from(sessionHostToken);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
