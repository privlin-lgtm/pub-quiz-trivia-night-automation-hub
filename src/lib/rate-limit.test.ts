import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

function requestFrom(ip: string) {
  return new NextRequest("http://localhost/api/x", {
    headers: { "x-forwarded-for": ip },
  });
}

// The limiter's bucket map is module-level (shared across the whole test
// file), so every test uses its own `key` namespace to stay isolated from
// the others rather than relying on execution order.
let key = 0;
function freshKey() {
  key += 1;
  return `test-${key}`;
}

describe("rateLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit, then blocks", () => {
    const k = freshKey();
    const req = requestFrom("1.1.1.1");
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(req, k, { limit: 3, windowMs: 60_000 }).allowed).toBe(true);
    }
    const blocked = rateLimit(req, k, { limit: 3, windowMs: 60_000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const req = requestFrom("2.2.2.2");
    const keyA = freshKey();
    const keyB = freshKey();
    for (let i = 0; i < 3; i++) rateLimit(req, keyA, { limit: 3, windowMs: 60_000 });
    // keyA is now exhausted; keyB should be untouched by it.
    expect(rateLimit(req, keyB, { limit: 3, windowMs: 60_000 }).allowed).toBe(true);
  });

  it("tracks separate IPs independently under the same key", () => {
    const k = freshKey();
    const reqA = requestFrom("3.3.3.3");
    const reqB = requestFrom("4.4.4.4");
    for (let i = 0; i < 3; i++) rateLimit(reqA, k, { limit: 3, windowMs: 60_000 });
    expect(rateLimit(reqA, k, { limit: 3, windowMs: 60_000 }).allowed).toBe(false);
    expect(rateLimit(reqB, k, { limit: 3, windowMs: 60_000 }).allowed).toBe(true);
  });

  it("uses only the first address in a comma-separated x-forwarded-for", () => {
    const k = freshKey();
    const spoofed = new NextRequest("http://localhost/api/x", {
      headers: { "x-forwarded-for": "5.5.5.5, 9.9.9.9" },
    });
    const plain = requestFrom("5.5.5.5");
    for (let i = 0; i < 3; i++) rateLimit(spoofed, k, { limit: 3, windowMs: 60_000 });
    // Same real client (5.5.5.5) whether or not a proxy chain is appended.
    expect(rateLimit(plain, k, { limit: 3, windowMs: 60_000 }).allowed).toBe(false);
  });

  it("resets the window after it expires", () => {
    vi.useFakeTimers();
    const k = freshKey();
    const req = requestFrom("6.6.6.6");
    for (let i = 0; i < 2; i++) rateLimit(req, k, { limit: 2, windowMs: 1000 });
    expect(rateLimit(req, k, { limit: 2, windowMs: 1000 }).allowed).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(rateLimit(req, k, { limit: 2, windowMs: 1000 }).allowed).toBe(true);
  });
});
