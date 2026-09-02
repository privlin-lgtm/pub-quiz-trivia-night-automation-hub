import { db } from "@/lib/db";
import type { GeneratedPack } from "@/lib/quiz-schema";

export async function createPackFromGenerated(generated: GeneratedPack, prompt: string) {
  return db.quizPack.create({
    data: {
      title: generated.title,
      prompt,
      rounds: {
        create: generated.rounds.map((round, roundIndex) => ({
          index: roundIndex,
          title: round.title,
          category: round.category,
          questions: {
            create: round.questions.map((question, questionIndex) => ({
              index: questionIndex,
              text: question.text,
              answer: question.answer,
              points: question.points,
            })),
          },
        })),
      },
    },
    include: { rounds: { include: { questions: true }, orderBy: { index: "asc" } } },
  });
}
