import { describe, expect, it } from "vitest";
import { topScorers, winningNames } from "@/lib/scoreboard-summary";

function row(teamId: string, name: string, score: number) {
  return { teamId, name, score };
}

describe("topScorers", () => {
  it("picks the single leader when there's no tie", () => {
    const board = [row("1", "Quiz Pigs", 5), row("2", "Trivia Titans", 3)];
    expect(topScorers(board)).toEqual({ winners: [row("1", "Quiz Pigs", 5)], topScore: 5 });
  });

  it("returns every team tied for first", () => {
    const board = [row("1", "Quiz Pigs", 5), row("2", "Trivia Titans", 5), row("3", "Last Place", 1)];
    const { winners, topScore } = topScorers(board);
    expect(topScore).toBe(5);
    expect(winners.map((w) => w.teamId)).toEqual(["1", "2"]);
  });

  it("handles an empty scoreboard", () => {
    expect(topScorers([])).toEqual({ winners: [], topScore: 0 });
  });
});

describe("winningNames", () => {
  it("formats a single winner", () => {
    expect(winningNames([row("1", "Quiz Pigs", 5)])).toBe("Quiz Pigs");
  });

  it("formats two winners with an ampersand, no comma", () => {
    expect(winningNames([row("1", "Quiz Pigs", 5), row("2", "Trivia Titans", 5)])).toBe(
      "Quiz Pigs & Trivia Titans"
    );
  });

  it("formats three or more with a serial comma before the final ampersand", () => {
    expect(
      winningNames([row("1", "A", 5), row("2", "B", 5), row("3", "C", 5)])
    ).toBe("A, B & C");
  });

  it("falls back to a plain message when nobody played", () => {
    expect(winningNames([])).toBe("No teams played");
  });
});
