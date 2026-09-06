export function normalizeAnswer(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^(a|an|the)\s+/, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

/** True when `submitted` normalizes to match `correct`, or any of the
 * question's host-approved `acceptableAnswers` — alternate spellings,
 * nicknames, or partial names ("7" for "Seven", "Leo" for "Leonardo
 * DiCaprio") that would otherwise score wrong until manually overridden. */
export function isLikelyCorrect(submitted: string, correct: string, acceptableAnswers: string[] = []): boolean {
  const normalizedSubmitted = normalizeAnswer(submitted);
  if (normalizedSubmitted === normalizeAnswer(correct)) return true;
  return acceptableAnswers.some((answer) => normalizeAnswer(answer) === normalizedSubmitted);
}
