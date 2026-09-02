import { describe, expect, it } from "vitest";
import { computeScoreboard } from "@/lib/scoreboard";
import type { Answer, Team } from "@prisma/client";

function team(id: string, name: string): Team {
  return { id, name, sessionId: "s1", token: `tok-${id}`, createdAt: new Date() };
}

function answer(teamId: string, points: number): Answer {
  return {
    id: `a-${teamId}-${points}-${Math.random()}`,
    sessionId: "s1",
    teamId,
    roundIndex: 0,
    questionIndex: 0,
    text: "x",
    isCorrect: points > 0,
    pointsAwarded: points,
    submittedAt: new Date(),
  };
}

describe("computeScoreboard", () => {
  it("sums points per team and sorts descending", () => {
    const teams = [team("t1", "Alpha"), team("t2", "Beta")];
    const answers = [answer("t1", 1), answer("t1", 2), answer("t2", 5)];

    const board = computeScoreboard(teams, answers);

    expect(board).toEqual([
      { teamId: "t2", name: "Beta", score: 5 },
      { teamId: "t1", name: "Alpha", score: 3 },
    ]);
  });

  it("includes teams with zero answers", () => {
    const teams = [team("t1", "Alpha")];
    const board = computeScoreboard(teams, []);
    expect(board).toEqual([{ teamId: "t1", name: "Alpha", score: 0 }]);
  });
});
