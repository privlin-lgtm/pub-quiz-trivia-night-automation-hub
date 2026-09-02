import type { GeneratedPack } from "@/lib/quiz-schema";

export const DEMO_PACK_PROMPT =
  "Demo pack: two short rounds (general knowledge, 90s pop culture) for trying out the app without an API key.";

export const DEMO_PACK: GeneratedPack = {
  title: "Friday Night Demo Pack",
  rounds: [
    {
      title: "Round 1",
      category: "General Knowledge",
      questions: [
        { text: "What is the capital of Australia?", answer: "Canberra", points: 1 },
        { text: "How many continents are there?", answer: "Seven", points: 1 },
        { text: "What planet is known as the Red Planet?", answer: "Mars", points: 1 },
      ],
    },
    {
      title: "Round 2",
      category: "90s Pop Culture",
      questions: [
        { text: "Who played Jack in the 1997 film Titanic?", answer: "Leonardo DiCaprio", points: 2 },
        { text: "What was the best-selling console of the 1990s?", answer: "Sony PlayStation", points: 2 },
        { text: "Which British girl group released 'Wannabe' in 1996?", answer: "Spice Girls", points: 2 },
      ],
    },
  ],
};
