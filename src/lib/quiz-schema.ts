import { z } from "zod";
import { isValidOptionSet, QUESTION_TYPE } from "@/lib/question-types";

// The field set on its own, so the portable pack file (src/lib/pack-file.ts)
// can extend it before applying the same degrade-to-TEXT rule below.
export const generatedQuestionFields = z.object({
  text: z.string().min(1),
  answer: z.string().min(1),
  points: z.number().int().min(1).max(10).default(1),
  type: z.enum([QUESTION_TYPE.TEXT, QUESTION_TYPE.MULTIPLE_CHOICE]).default(QUESTION_TYPE.TEXT),
  options: z.array(z.string().min(1)).max(6).optional(),
});

// A multiple-choice question whose option set is unusable (too few
// distinct options, or none of them is the answer) is still a perfectly
// good free-text question: the answer is known. Degrade it to TEXT rather
// than reject it — rejecting threw away the *entire* generated pack for one
// malformed question, and did so deterministically for some prompts.
export function degradeInvalidMultipleChoice<
  T extends { type: string; answer: string; options?: string[] | undefined },
>(q: T): T {
  return q.type === QUESTION_TYPE.MULTIPLE_CHOICE && !isValidOptionSet(q.options ?? [], q.answer)
    ? { ...q, type: QUESTION_TYPE.TEXT, options: undefined }
    : q;
}

export const generatedQuestionSchema = generatedQuestionFields.transform(degradeInvalidMultipleChoice);

export const generatedRoundSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  questions: z.array(generatedQuestionSchema).min(1),
});

export const generatedPackSchema = z.object({
  title: z.string().min(1),
  rounds: z.array(generatedRoundSchema).min(1),
});

export type GeneratedPack = z.infer<typeof generatedPackSchema>;
export type GeneratedRound = z.infer<typeof generatedRoundSchema>;
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

export const wizardRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
});
