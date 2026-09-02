import { describe, expect, it } from "vitest";
import { isLikelyCorrect, normalizeAnswer } from "@/lib/scoring";

describe("normalizeAnswer", () => {
  it("lowercases and trims", () => {
    expect(normalizeAnswer("  Canberra  ")).toBe("canberra");
  });

  it("strips a leading article", () => {
    expect(normalizeAnswer("The Beatles")).toBe("beatles");
    expect(normalizeAnswer("A Streetcar")).toBe("streetcar");
    expect(normalizeAnswer("An Apple")).toBe("apple");
  });

  it("strips punctuation and collapses whitespace", () => {
    expect(normalizeAnswer("Leonardo, DiCaprio!")).toBe("leonardo dicaprio");
    expect(normalizeAnswer("Spice   Girls")).toBe("spice girls");
  });
});

describe("isLikelyCorrect", () => {
  it("matches case- and punctuation-insensitively", () => {
    expect(isLikelyCorrect("canberra", "Canberra")).toBe(true);
    expect(isLikelyCorrect("the beatles", "Beatles")).toBe(true);
    expect(isLikelyCorrect("mars.", "Mars")).toBe(true);
  });

  it("rejects wrong answers", () => {
    expect(isLikelyCorrect("Venus", "Mars")).toBe(false);
    expect(isLikelyCorrect("", "Mars")).toBe(false);
  });
});
