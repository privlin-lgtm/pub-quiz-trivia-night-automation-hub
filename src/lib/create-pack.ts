import { db } from "@/lib/db";
import type { GeneratedPack } from "@/lib/quiz-schema";
import { QUESTION_TYPE, serializeOptions } from "@/lib/question-types";

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
              type: question.type ?? QUESTION_TYPE.TEXT,
              options:
                question.type === QUESTION_TYPE.MULTIPLE_CHOICE && question.options
                  ? serializeOptions(question.options)
                  : null,
            })),
          },
        })),
      },
    },
    include: { rounds: { include: { questions: true }, orderBy: { index: "asc" } } },
  });
}
