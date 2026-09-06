import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toQuestionView } from "@/lib/question-types";
import { PrintPreview } from "./PrintPreview";

export const dynamic = "force-dynamic";

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
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
  if (!pack) notFound();

  return (
    <PrintPreview
      pack={{
        ...pack,
        createdAt: pack.createdAt.toISOString(),
        rounds: pack.rounds.map((round) => ({
          ...round,
          questions: round.questions.map(toQuestionView),
        })),
      }}
    />
  );
}
