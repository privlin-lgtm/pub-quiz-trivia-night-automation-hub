import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const packs = await db.quizPack.findMany({
    orderBy: { createdAt: "desc" },
    include: { rounds: { include: { questions: true } } },
  });

  return NextResponse.json({
    packs: packs.map((pack) => ({
      id: pack.id,
      title: pack.title,
      createdAt: pack.createdAt,
      roundCount: pack.rounds.length,
      questionCount: pack.rounds.reduce((sum, r) => sum + r.questions.length, 0),
    })),
  });
}
