import type { Creator } from "@prisma/client";

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
