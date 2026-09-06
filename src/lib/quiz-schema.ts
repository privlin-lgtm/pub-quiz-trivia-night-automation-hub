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
  .refine((q) => q.type !== QUESTION_TYPE.MULTIPLE_CHOICE || isValidOptionSet(q.options ?? [], q.answer), {
    message: "multiple_choice questions need at least 2 distinct options, one of which is the answer",
    path: ["options"],
  });

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
