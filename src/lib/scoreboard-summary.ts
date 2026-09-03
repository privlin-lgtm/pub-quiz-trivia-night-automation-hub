import type { ScoreboardRow } from "@/lib/api-types";

/** Every team tied for first place, and what that score was. Ties are real
 *  in a pub quiz (two teams both nail every question), so this is never
 *  just "the first row". */
export function topScorers(scoreboard: ScoreboardRow[]): { winners: ScoreboardRow[]; topScore: number } {
  const topScore = scoreboard[0]?.score ?? 0;
  return { winners: scoreboard.filter((row) => row.score === topScore), topScore };
}

/** "Quiz Pigs" / "Quiz Pigs & The Underdogs" / "A, B & C" — never an
 *  Oxford-comma-less run-on, never a bare list. */
export function winningNames(winners: ScoreboardRow[]): string {
  const names = winners.map((row) => row.name);
  if (names.length === 0) return "No teams played";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}
