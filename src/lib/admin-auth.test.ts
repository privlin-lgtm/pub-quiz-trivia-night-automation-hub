import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { isAuthorizedAdmin } from "@/lib/admin-auth";

function requestWith(token: string | null) {
  return new NextRequest("http://localhost/api/x", {
    headers: token ? { "x-admin-token": token } : {},
  });
}

describe("isAuthorizedAdmin", () => {
  const originalToken = process.env.ADMIN_TOKEN;

  afterEach(() => {
    if (originalToken === undefined) delete process.env.ADMIN_TOKEN;
    else process.env.ADMIN_TOKEN = originalToken;
  });

  it("allows every request when ADMIN_TOKEN is unset (solo local dev default)", () => {
    delete process.env.ADMIN_TOKEN;
    expect(isAuthorizedAdmin(requestWith(null))).toBe(true);
    expect(isAuthorizedAdmin(requestWith("anything"))).toBe(true);
  });

  describe("when ADMIN_TOKEN is set", () => {
    beforeEach(() => {
      process.env.ADMIN_TOKEN = "correct-horse-battery-staple";
    });

    it("rejects a missing header", () => {
      expect(isAuthorizedAdmin(requestWith(null))).toBe(false);
    });

    it("rejects a wrong token", () => {
      expect(isAuthorizedAdmin(requestWith("wrong-token"))).toBe(false);
    });

    it("rejects a token of a different length (before the timing-safe compare)", () => {
      expect(isAuthorizedAdmin(requestWith("short"))).toBe(false);
    });

    it("accepts the exact configured token", () => {
      expect(isAuthorizedAdmin(requestWith("correct-horse-battery-staple"))).toBe(true);
    });
  });
});
