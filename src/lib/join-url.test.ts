import { describe, expect, it } from "vitest";
import { buildJoinUrl, readJoinCode } from "@/lib/join-url";

describe("buildJoinUrl", () => {
  it("points at /play with the session code as a query parameter", () => {
    expect(buildJoinUrl("https://quiz.example", "AB3K7")).toBe("https://quiz.example/play?code=AB3K7");
  });

  it("tolerates a trailing slash on the origin", () => {
    expect(buildJoinUrl("https://quiz.example/", "AB3K7")).toBe("https://quiz.example/play?code=AB3K7");
  });
});

describe("readJoinCode", () => {
  it("returns the code from a ?code= query string, uppercased", () => {
    expect(readJoinCode("?code=ab3k7")).toBe("AB3K7");
  });

  it("returns an empty string when the parameter is missing", () => {
    expect(readJoinCode("")).toBe("");
    expect(readJoinCode("?other=1")).toBe("");
  });

  it("strips characters outside the join-code alphabet and caps at five", () => {
    // Mirrors the input's own sanitising so a mangled or padded link can't
    // prefill something the form would never accept.
    expect(readJoinCode("?code=a-b3k7xx")).toBe("AB3K7");
    expect(readJoinCode("?code=01IO")).toBe("");
  });
});
