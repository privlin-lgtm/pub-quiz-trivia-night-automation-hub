import type { Prisma } from "@prisma/client";

export const SESSION_STATUS = {
  LOBBY: "LOBBY",
  QUESTION_ACTIVE: "QUESTION_ACTIVE",
  REVEAL: "REVEAL",
  ENDED: "ENDED",
} as const;

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

const packWithRounds = {
  include: {
    rounds: {
      orderBy: { index: "asc" },
      include: { questions: { orderBy: { index: "asc" } } },
    },
  },
} satisfies Prisma.QuizPackDefaultArgs;

export type PackWithRounds = Prisma.QuizPackGetPayload<typeof packWithRounds>;
export const packWithRoundsArgs = packWithRounds;

export function getCurrentRound(pack: PackWithRounds, roundIndex: number) {
  return pack.rounds[roundIndex] ?? null;
}

export function getCurrentQuestion(pack: PackWithRounds, roundIndex: number, questionIndex: number) {
  const round = getCurrentRound(pack, roundIndex);
  if (!round) return null;
  return round.questions[questionIndex] ?? null;
}

/** Returns the next {roundIndex, questionIndex}, or null if the quiz is over. */
export function computeNextPosition(
  pack: PackWithRounds,
  roundIndex: number,
  questionIndex: number
): { roundIndex: number; questionIndex: number } | null {
  const round = getCurrentRound(pack, roundIndex);
  if (!round) return null;

  if (questionIndex + 1 < round.questions.length) {
    return { roundIndex, questionIndex: questionIndex + 1 };
  }
  if (roundIndex + 1 < pack.rounds.length) {
    return { roundIndex: roundIndex + 1, questionIndex: 0 };
  }
  return null;
}
