import { describe, expect, it } from "vitest";
import { wizardRequestSchema } from "@/lib/quiz-schema";

describe("wizardRequestSchema", () => {
  it("rejects an empty prompt", () => {
    expect(wizardRequestSchema.safeParse({ prompt: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only prompt", () => {
    // Regression: .min(1) alone passes on "   " (length 3), and the
    // wizard would spend a real Anthropic API call generating from
    // nothing. Trimming before the length check is what makes this fail.
    expect(wizardRequestSchema.safeParse({ prompt: "   \n\t  " }).success).toBe(false);
  });

  it("trims leading/trailing whitespace from an otherwise-valid prompt", () => {
    const result = wizardRequestSchema.safeParse({ prompt: "  Four rounds of trivia  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.prompt).toBe("Four rounds of trivia");
  });

  it("accepts exactly 2000 characters", () => {
    expect(wizardRequestSchema.safeParse({ prompt: "a".repeat(2000) }).success).toBe(true);
  });

  it("rejects 2001 characters", () => {
    expect(wizardRequestSchema.safeParse({ prompt: "a".repeat(2001) }).success).toBe(false);
  });

  it("rejects a missing prompt field", () => {
    expect(wizardRequestSchema.safeParse({}).success).toBe(false);
  });
});
