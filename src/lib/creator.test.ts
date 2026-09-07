import { describe, expect, it } from "vitest";
import { canGenerate, FREE_LIMIT, withRolledPeriod } from "@/lib/creator";
import type { Creator } from "@prisma/client";

function makeCreator(overrides: Partial<Creator> = {}): Creator {
  return {
    id: "creator_1",
    deviceKey: "device_1",
    plan: "FREE",
    packsGeneratedInPeriod: 0,
    periodStartedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

describe("withRolledPeriod", () => {
  it("leaves an in-window creator unchanged", () => {
    const creator = makeCreator({ packsGeneratedInPeriod: 1, periodStartedAt: new Date() });
    const rolled = withRolledPeriod(creator);
    expect(rolled.packsGeneratedInPeriod).toBe(1);
    expect(rolled.periodStartedAt).toBe(creator.periodStartedAt);
  });

  it("resets an expired-period creator", () => {
    const longAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const creator = makeCreator({ packsGeneratedInPeriod: 2, periodStartedAt: longAgo });
    const rolled = withRolledPeriod(creator);
    expect(rolled.packsGeneratedInPeriod).toBe(0);
    expect(rolled.periodStartedAt.getTime()).toBeGreaterThan(longAgo.getTime());
  });

  it("does not reset exactly at the boundary (not yet expired)", () => {
    const justUnderThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 1000);
    const creator = makeCreator({ packsGeneratedInPeriod: 2, periodStartedAt: justUnderThreshold });
    const rolled = withRolledPeriod(creator);
    expect(rolled.packsGeneratedInPeriod).toBe(2);
  });
});

describe("canGenerate", () => {
  it("allows a FREE creator under the limit", () => {
    expect(canGenerate(makeCreator({ packsGeneratedInPeriod: FREE_LIMIT - 1 }))).toBe(true);
  });

  it("blocks a FREE creator at the limit", () => {
    expect(canGenerate(makeCreator({ packsGeneratedInPeriod: FREE_LIMIT }))).toBe(false);
  });

  it("blocks a FREE creator over the limit", () => {
    expect(canGenerate(makeCreator({ packsGeneratedInPeriod: FREE_LIMIT + 1 }))).toBe(false);
  });

  it("always allows a PRO creator, even over the limit", () => {
    expect(canGenerate(makeCreator({ plan: "PRO", packsGeneratedInPeriod: FREE_LIMIT + 5 }))).toBe(true);
  });

  it("allows a FREE creator whose period has expired, even if it was previously at the limit", () => {
    const longAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    expect(canGenerate(makeCreator({ packsGeneratedInPeriod: FREE_LIMIT, periodStartedAt: longAgo }))).toBe(true);
  });
});
