import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toPackFile } from "@/lib/pack-file";
import { toQuestionView } from "@/lib/question-types";

function filenameFor(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "quiz-pack"}.json`;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pack = await db.quizPack.findUnique({
    where: { id },
    include: {
      rounds: {
        orderBy: { index: "asc" },
        include: { questions: { orderBy: { index: "asc" } } },
      },
    },
  });
  if (!pack) {
    return NextResponse.json({ error: "Pack not found" }, { status: 404 });
  }

  const file = toPackFile({
    ...pack,
    createdAt: pack.createdAt.toISOString(),
    rounds: pack.rounds.map((round) => ({ ...round, questions: round.questions.map(toQuestionView) })),
  });

  return new NextResponse(JSON.stringify(file, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameFor(pack.title)}"`,
    },
  });
}
