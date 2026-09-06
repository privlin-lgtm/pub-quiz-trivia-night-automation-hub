export const QUESTION_TYPE = {
  TEXT: "TEXT",
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
} as const;

export type QuestionType = (typeof QUESTION_TYPE)[keyof typeof QUESTION_TYPE];

/**
 * Question.options is stored as a JSON-encoded string (plain TEXT column —
 * SQLite has no native array/JSON type, and nothing here ever needs to query
 * inside the list, only read or write it whole). This parses it back,
 * defensively: a TEXT question's null, or any malformed/pre-migration data,
 * just yields no options rather than throwing.
 */
export function parseOptions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((o): o is string => typeof o === "string") : [];
  } catch {
    return [];
  }
}

export function serializeOptions(options: string[]): string {
  return JSON.stringify(options);
}

/** True when `options` is a valid choice set for a multiple-choice question:
 * at least 2 distinct, non-blank options, one of which is the answer. */
export function isValidOptionSet(options: string[], answer: string): boolean {
  const cleaned = Array.from(new Set(options.map((o) => o.trim()).filter(Boolean)));
  return cleaned.length >= 2 && cleaned.includes(answer);
}

/** Maps a raw Question row (Prisma's `type`/`options` are plain `string` /
 * `string | null`, not the narrower client-facing shape) to the
 * api-types.ts view: `type` narrowed, `options` parsed. */
export function toQuestionView<T extends { type: string; options: string | null }>(
  question: T
): Omit<T, "options"> & { type: QuestionType; options: string[] } {
  return { ...question, type: question.type as QuestionType, options: parseOptions(question.options) };
}
