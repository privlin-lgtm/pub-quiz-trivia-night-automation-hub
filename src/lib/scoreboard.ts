import type { Answer, Team } from "@prisma/client";

export function computeScoreboard(teams: Team[], answers: Answer[]) {
  const totals = new Map<string, number>();
  for (const team of teams) totals.set(team.id, 0);
  for (const answer of answers) {
    totals.set(answer.teamId, (totals.get(answer.teamId) ?? 0) + answer.pointsAwarded);
  }
  return teams
    .map((team) => ({ teamId: team.id, name: team.name, score: totals.get(team.id) ?? 0 }))
    .sort((a, b) => b.score - a.score);
}
