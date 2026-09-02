import { z } from "zod";

export const generatedQuestionSchema = z.object({
  text: z.string().min(1),
  answer: z.string().min(1),
  points: z.number().int().min(1).max(10).default(1),
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
  prompt: z.string().min(1).max(2000),
});
