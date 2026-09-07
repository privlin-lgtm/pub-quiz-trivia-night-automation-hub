import { z } from "zod";
import { isValidOptionSet, QUESTION_TYPE } from "@/lib/question-types";

export const generatedQuestionSchema = z
  .object({
    text: z.string().min(1),
    answer: z.string().min(1),
    points: z.number().int().min(1).max(10).default(1),
    type: z.enum([QUESTION_TYPE.TEXT, QUESTION_TYPE.MULTIPLE_CHOICE]).default(QUESTION_TYPE.TEXT),
    options: z.array(z.string().min(1)).max(6).optional(),
  })
  // A multiple-choice question whose option set is unusable (too few
  // distinct options, or none of them is the answer) is still a perfectly
  // good free-text question: the answer is known. Degrade it to TEXT rather
  // than reject it — rejecting threw away the *entire* generated pack for one
  // malformed question, and did so deterministically for some prompts.
  .transform((q) =>
    q.type === QUESTION_TYPE.MULTIPLE_CHOICE && !isValidOptionSet(q.options ?? [], q.answer)
      ? { ...q, type: QUESTION_TYPE.TEXT, options: undefined }
      : q
  );

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
