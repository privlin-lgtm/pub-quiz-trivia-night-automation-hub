import { randomUUID } from "node:crypto";
import type { Creator } from "@prisma/client";
import type { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const FREE_LIMIT = 2;
const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Rolls an expired 30-day period back to zero. Pure — never writes to the DB.
 * The caller decides when (if ever) to persist the result.
 */
export function withRolledPeriod(creator: Creator): Creator {
  const expired = Date.now() - creator.periodStartedAt.getTime() > PERIOD_MS;
  if (!expired) return creator;
  return { ...creator, packsGeneratedInPeriod: 0, periodStartedAt: new Date() };
}

export function canGenerate(creator: Creator): boolean {
  if (creator.plan === "PRO") return true;
  return withRolledPeriod(creator).packsGeneratedInPeriod < FREE_LIMIT;
}

export const COOKIE_NAME = "pq_creator";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
}

/**
 * Reads the identity cookie and returns the matching Creator, creating one
 * (with a fresh cookie) if the cookie is missing or stale (no matching row —
 * e.g. a reset DB). Only ever called from the generate route: creating a
 * Creator has a real (tiny) cost, so it stays lazy rather than firing on
 * every page visit.
 */
export async function getOrCreateCreator(
  req: NextRequest
): Promise<{ creator: Creator; setCookieOn: (res: NextResponse) => void }> {
  const existingKey = req.cookies.get(COOKIE_NAME)?.value;
  if (existingKey) {
    const found = await db.creator.findUnique({ where: { deviceKey: existingKey } });
    if (found) return { creator: found, setCookieOn: () => {} };
  }

  const deviceKey = randomUUID();
  const creator = await db.creator.create({ data: { deviceKey } });
  return {
    creator,
    setCookieOn: (res) => res.cookies.set(COOKIE_NAME, deviceKey, cookieOptions()),
  };
}

/** Read-only lookup for the status endpoint — never creates a row or sets a cookie. */
export async function getCreatorReadOnly(req: NextRequest) {
  const deviceKey = req.cookies.get(COOKIE_NAME)?.value;
  if (!deviceKey) return null;
  return db.creator.findUnique({ where: { deviceKey } });
}
