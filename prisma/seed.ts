import { PrismaClient } from "@prisma/client";
import { DEMO_PACK, DEMO_PACK_PROMPT } from "../src/lib/demo-pack";

const db = new PrismaClient();

async function main() {
  const existing = await db.quizPack.findFirst({ where: { title: DEMO_PACK.title } });
  if (existing) {
    console.log(`Demo pack already exists: ${existing.id}`);
    return;
  }

  const pack = await db.quizPack.create({
    data: {
      title: DEMO_PACK.title,
      prompt: DEMO_PACK_PROMPT,
      rounds: {
        create: DEMO_PACK.rounds.map((round, roundIndex) => ({
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
  });

  console.log(`Seeded demo pack: ${pack.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
