import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { creatorIdFromRequest, visiblePacksWhere } from "@/lib/pack-access";

export async function GET(req: NextRequest) {
  const creatorId = await creatorIdFromRequest(req);
  const packs = await db.quizPack.findMany({
    where: visiblePacksWhere(creatorId),
    orderBy: { createdAt: "desc" },
    take: 100, // bound worst-case query/response cost as packs accumulate
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
