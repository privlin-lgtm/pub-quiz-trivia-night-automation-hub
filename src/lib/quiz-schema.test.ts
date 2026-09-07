import { describe, expect, it } from "vitest";
import { generatedPackSchema, generatedQuestionSchema, wizardRequestSchema } from "@/lib/quiz-schema";

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

describe("generatedQuestionSchema", () => {
  it("defaults to type TEXT when omitted, requiring no options", () => {
    const result = generatedQuestionSchema.safeParse({ text: "Q?", answer: "A" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.type).toBe("TEXT");
  });

  it("accepts a well-formed multiple-choice question", () => {
    const result = generatedQuestionSchema.safeParse({
      text: "Capital of Australia?",
      answer: "Canberra",
      type: "MULTIPLE_CHOICE",
      options: ["Sydney", "Canberra", "Melbourne"],
    });
    expect(result.success).toBe(true);
  });

  // A multiple-choice question with a broken option set is still a usable
  // question: the answer is known, so it degrades to free-text instead of
  // sinking the whole generated pack. (Observed in production: one such
  // question made every "1990s pop music" prompt 502 deterministically.)
  it("falls back to TEXT for multiple-choice with fewer than 2 options", () => {
    const result = generatedQuestionSchema.safeParse({
      text: "Q?",
      answer: "A",
      type: "MULTIPLE_CHOICE",
      options: ["A"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("TEXT");
      expect(result.data.options).toBeUndefined();
      expect(result.data.answer).toBe("A");
    }
  });

  it("falls back to TEXT for multiple-choice whose options don't include the answer", () => {
    const result = generatedQuestionSchema.safeParse({
      text: "Q?",
      answer: "A",
      type: "MULTIPLE_CHOICE",
      options: ["B", "C"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("TEXT");
      expect(result.data.options).toBeUndefined();
    }
  });

  it("falls back to TEXT for multiple-choice with no options at all", () => {
    const result = generatedQuestionSchema.safeParse({ text: "Q?", answer: "A", type: "MULTIPLE_CHOICE" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.type).toBe("TEXT");
  });

  it("keeps a well-formed multiple-choice question whose answer has stray whitespace", () => {
    const result = generatedQuestionSchema.safeParse({
      text: "Which band released Nevermind?",
      answer: "Nirvana ",
      type: "MULTIPLE_CHOICE",
      options: ["Nirvana", "Oasis", "Blur"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("MULTIPLE_CHOICE");
      expect(result.data.options).toEqual(["Nirvana", "Oasis", "Blur"]);
    }
  });
});

describe("generatedPackSchema", () => {
  it("keeps the rest of the pack when one question's option set is malformed", () => {
    const result = generatedPackSchema.safeParse({
      title: "Pack",
      rounds: [
        {
          title: "Music",
          category: "Music",
          questions: [
            { text: "Q1?", answer: "A1" },
            { text: "Q2?", answer: "A2", type: "MULTIPLE_CHOICE", options: ["B", "C"] },
            { text: "Q3?", answer: "A3", type: "MULTIPLE_CHOICE", options: ["A3", "X"] },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const types = result.data.rounds[0].questions.map((q) => q.type);
      expect(types).toEqual(["TEXT", "TEXT", "MULTIPLE_CHOICE"]);
    }
  });
});
