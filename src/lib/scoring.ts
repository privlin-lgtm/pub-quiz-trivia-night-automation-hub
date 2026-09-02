export function normalizeAnswer(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^(a|an|the)\s+/, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

export function isLikelyCorrect(submitted: string, correct: string): boolean {
  return normalizeAnswer(submitted) === normalizeAnswer(correct);
}
