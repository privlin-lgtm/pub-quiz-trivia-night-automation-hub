import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { SESSION_STATUS, computeNextPosition, packWithRoundsArgs, type PackWithRounds } from "@/lib/session-state";

const advanceSchema = z.object({
  action: z.enum(["start", "reveal", "next"]),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await req.json().catch(() => null);
  const parsed = advanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const session = await db.session.findUnique({ where: { code: code.toUpperCase() } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const pack = (await db.quizPack.findUnique({
    where: { id: session.packId },
    ...packWithRoundsArgs,
  })) as PackWithRounds | null;
  if (!pack) {
    return NextResponse.json({ error: "Pack not found" }, { status: 404 });
  }

  const { action } = parsed.data;

  if (action === "start") {
    if (session.status !== SESSION_STATUS.LOBBY) {
      return NextResponse.json({ error: "Quiz already started" }, { status: 409 });
    }
    const updated = await db.session.update({
      where: { id: session.id },
      data: { status: SESSION_STATUS.QUESTION_ACTIVE, currentRoundIndex: 0, currentQuestionIndex: 0 },
    });
    return NextResponse.json({ session: updated });
  }

  if (action === "reveal") {
    if (session.status !== SESSION_STATUS.QUESTION_ACTIVE) {
      return NextResponse.json({ error: "No active question to reveal" }, { status: 409 });
    }
    const updated = await db.session.update({
      where: { id: session.id },
      data: { status: SESSION_STATUS.REVEAL },
    });
    return NextResponse.json({ session: updated });
  }

  // action === "next"
  if (session.status !== SESSION_STATUS.REVEAL) {
    return NextResponse.json({ error: "Reveal the current answer before advancing" }, { status: 409 });
  }
  const next = computeNextPosition(pack, session.currentRoundIndex, session.currentQuestionIndex);
  const updated = await db.session.update({
    where: { id: session.id },
    data: next
      ? {
          status: SESSION_STATUS.QUESTION_ACTIVE,
          currentRoundIndex: next.roundIndex,
          currentQuestionIndex: next.questionIndex,
        }
      : { status: SESSION_STATUS.ENDED },
  });
  return NextResponse.json({ session: updated });
}
