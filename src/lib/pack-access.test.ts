import { describe, expect, it } from "vitest";
import { visiblePacksWhere } from "@/lib/pack-access";

describe("visiblePacksWhere", () => {
  it("shows only ownerless packs to a visitor with no creator", () => {
    expect(visiblePacksWhere(null)).toEqual({ creatorId: null });
  });

  it("shows ownerless packs plus the creator's own packs", () => {
    expect(visiblePacksWhere("creator-1")).toEqual({
      OR: [{ creatorId: null }, { creatorId: "creator-1" }],
    });
  });
});
