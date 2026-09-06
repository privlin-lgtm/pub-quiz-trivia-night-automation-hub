export type PackSummary = {
  id: string;
  title: string;
  createdAt: string;
  roundCount: number;
  questionCount: number;
};

export type Question = {
  id: string;
  index: number;
  text: string;
  answer: string;
  points: number;
};

export type Round = {
  id: string;
  index: number;
  title: string;
  category: string;
  questions: Question[];
};

export type Pack = {
  id: string;
  title: string;
  prompt: string;
  createdAt: string;
  rounds: Round[];
};

export type ScoreboardRow = {
  teamId: string;
  name: string;
  score: number;
};

export type SessionStatus = "LOBBY" | "QUESTION_ACTIVE" | "REVEAL" | "ENDED";

export type SessionQuestion = {
  id: string;
  text: string;
  points: number;
  answer: string | null;
};

export type SessionRound = {
  title: string;
  category: string;
};

/** Null means no timer for this session — manual reveal only. */
export type TimerInfo = {
  startedAt: string;
  durationSeconds: number;
} | null;

export type HostTeam = {
  id: string;
  name: string;
  currentAnswer: {
    id: string;
    text: string;
    isCorrect: boolean | null;
    pointsAwarded: number;
  } | null;
};

export type HostSessionState = {
  code: string;
  status: SessionStatus;
  packTitle: string;
  roundNumber: number;
  totalRounds: number;
  questionNumber: number;
  totalQuestionsInRound: number;
  round: SessionRound | null;
  question: SessionQuestion | null;
  scoreboard: ScoreboardRow[];
  timer: TimerInfo;
  teams: HostTeam[];
};

export type TeamSessionState = {
  code: string;
  status: SessionStatus;
  packTitle: string;
  roundNumber: number;
  totalRounds: number;
  questionNumber: number;
  totalQuestionsInRound: number;
  round: SessionRound | null;
  question: SessionQuestion | null;
  scoreboard: ScoreboardRow[];
  timer: TimerInfo;
  teamName: string;
  myAnswer: {
    text: string;
    isCorrect: boolean | null;
    pointsAwarded: number | null;
  } | null;
};
