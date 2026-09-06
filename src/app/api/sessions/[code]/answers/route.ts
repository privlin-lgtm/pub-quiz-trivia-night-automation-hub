import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { SESSION_STATUS, getCurrentQuestion, packWithRoundsArgs, type PackWithRounds } from "@/lib/session-state";
import { autoRevealIfExpired } from "@/lib/session-timer";
import { isLikelyCorrect } from "@/lib/scoring";

const submitSchema = z.object({
  token: z.string().min(1),
  text: z.string().min(1).max(500),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid answer" }, { status: 400 });
  }

  let session = await db.session.findUnique({ where: { code: code.toUpperCase() } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  // A submission racing the timer's expiry should lose: check (and, if
  // needed, apply) the auto-reveal first so a request that arrives just past
  // the deadline is rejected instead of quietly scoring after time's up.
  session = await autoRevealIfExpired(session);
  if (session.status !== SESSION_STATUS.QUESTION_ACTIVE) {
    return NextResponse.json({ error: "This question is no longer accepting answers" }, { status: 409 });
  }

  const team = await db.team.findUnique({ where: { token: parsed.data.token } });
  if (!team || team.sessionId !== session.id) {
    return NextResponse.json({ error: "Invalid team token" }, { status: 401 });
  }

  const pack = (await db.quizPack.findUnique({
    where: { id: session.packId },
    ...packWithRoundsArgs,
  })) as PackWithRounds | null;
  const question = pack
    ? getCurrentQuestion(pack, session.currentRoundIndex, session.currentQuestionIndex)
    : null;
  if (!question) {
    return NextResponse.json({ error: "No active question" }, { status: 409 });
  }

  const text = parsed.data.text.trim();
  const isCorrect = isLikelyCorrect(text, question.answer);
  const pointsAwarded = isCorrect ? question.points : 0;

  const answer = await db.answer.upsert({
    where: {
      teamId_roundIndex_questionIndex: {
        teamId: team.id,
        roundIndex: session.currentRoundIndex,
        questionIndex: session.currentQuestionIndex,
      },
    },
    update: { text, isCorrect, pointsAwarded },
    create: {
      sessionId: session.id,
      teamId: team.id,
      roundIndex: session.currentRoundIndex,
      questionIndex: session.currentQuestionIndex,
      text,
      isCorrect,
      pointsAwarded,
    },
  });

  return NextResponse.json({ answer: { id: answer.id, text: answer.text } }, { status: 201 });
}
