import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Gate for destructive, unauthenticated-by-default routes (currently just
 * pack deletion — nothing in the UI calls it, but it's reachable). This app
 * has no user/account system, so a single shared operator secret is the
 * proportionate fix: set ADMIN_TOKEN to require it. Left unset, the route
 * stays open (today's behavior) since that matches solo local-dev use —
 * but it's the operator's job to set this before a shared/public deploy.
 */
export function isAuthorizedAdmin(req: NextRequest): boolean {
  const configured = process.env.ADMIN_TOKEN;
  if (!configured) return true;

  const provided = req.headers.get("x-admin-token");
  if (!provided) return false;

  const expected = Buffer.from(configured);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/**
 * Whether an admin override is even possible right now. A caller that wants
 * to treat "no ADMIN_TOKEN configured" as "no admin override, fall back to
 * ownership" — rather than isAuthorizedAdmin's own "unset means everyone is
 * admin" — should gate on this first. See its use in the pack DELETE route.
 */
export function isAdminTokenConfigured(): boolean {
  return Boolean(process.env.ADMIN_TOKEN);
}
