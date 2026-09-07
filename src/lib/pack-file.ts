import { z } from "zod";
import { degradeInvalidMultipleChoice, generatedQuestionFields, generatedRoundSchema } from "@/lib/quiz-schema";
import type { Pack } from "@/lib/api-types";
import { QUESTION_TYPE } from "@/lib/question-types";

/**
 * The portable pack file: what `GET /api/packs/[id]/export` writes and
 * `POST /api/packs/import` reads. Same shape the generator produces
 * (`generatedPackSchema`), plus a format/version envelope and the host's
 * `acceptableAnswers`, and minus anything database-specific (ids, indexes,
 * timestamps) so a file can be re-imported anywhere, any number of times.
 */
export const PACK_FILE_FORMAT = "pub-quiz-pack";
export const PACK_FILE_VERSION = 1;

const fileQuestionSchema = generatedQuestionFields
  .extend({ acceptableAnswers: z.array(z.string().min(1)).max(20).optional() })
  .transform(degradeInvalidMultipleChoice);

export const packFileSchema = z.object({
  format: z.literal(PACK_FILE_FORMAT),
  // Only the version this build writes. A newer file may carry fields this
  // build would silently drop, so refuse it rather than import a lossy copy.
  version: z.literal(PACK_FILE_VERSION),
  title: z.string().min(1),
  prompt: z.string().optional(),
  rounds: z
    .array(
      generatedRoundSchema.extend({
        questions: z.array(fileQuestionSchema).min(1),
      })
    )
    .min(1),
});

export type PackFile = z.infer<typeof packFileSchema>;

export function toPackFile(pack: Pack): PackFile {
  return {
    format: PACK_FILE_FORMAT,
    version: PACK_FILE_VERSION,
    title: pack.title,
    prompt: pack.prompt || undefined,
    rounds: pack.rounds.map((round) => ({
      title: round.title,
      category: round.category,
      questions: round.questions.map((q) => ({
        text: q.text,
        answer: q.answer,
        points: q.points,
        type: q.type,
        ...(q.type === QUESTION_TYPE.MULTIPLE_CHOICE ? { options: q.options } : {}),
        ...(q.acceptableAnswers.length > 0 ? { acceptableAnswers: q.acceptableAnswers } : {}),
      })),
    })),
  };
}
