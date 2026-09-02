import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const DEMO = {
  title: "Friday Night at The Anchor",
  prompt: "Seeded demo pack for local click-throughs.",
  rounds: [
    {
      title: "90s Hits",
      category: "Music",
      questions: [
        { text: "Which Spice Girl was nicknamed Sporty Spice?", answer: "Melanie Chisholm / Mel C", points: 1 },
        { text: "Who sang 'Wonderwall'?", answer: "Oasis", points: 1 },
        { text: "Which 1997 song asks you to 'tell me when it's over'?", answer: "Bitter Sweet Symphony", points: 2 },
      ],
    },
    {
      title: "Pub Geography",
      category: "UK & world",
      questions: [
        { text: "What is the capital of Wales?", answer: "Cardiff", points: 1 },
        { text: "Which river runs through Glasgow?", answer: "Clyde", points: 1 },
        { text: "Name the largest of the Canary Islands.", answer: "Tenerife", points: 2 },
      ],
    },
  ],
};

async function main() {
  const existing = await db.quizPack.findFirst({ where: { title: DEMO.title } });
  if (existing) {
    console.log(`Demo pack already exists: ${existing.id}`);
    return;
  }

  const pack = await db.quizPack.create({
    data: {
      title: DEMO.title,
      prompt: DEMO.prompt,
      rounds: {
        create: DEMO.rounds.map((round, roundIndex) => ({
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
