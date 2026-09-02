import type { NextRequest } from "next/server";

/**
 * Minimal in-memory fixed-window rate limiter. Deliberately not
 * distributed/persistent — this app runs as a single instance (single
 * SQLite file), so an in-process Map is proportionate. It resets on
 * restart/redeploy; that's an acceptable trade-off at this app's scale
 * (one operator's own deployment), not a multi-tenant SaaS guarantee.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  req: NextRequest,
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { allowed: boolean; retryAfterSeconds: number } {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();

  const bucket = buckets.get(bucketKey);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
