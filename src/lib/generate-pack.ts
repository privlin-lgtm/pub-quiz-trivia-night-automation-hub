import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient } from "@/lib/anthropic";
import { generatedPackSchema, type GeneratedPack } from "@/lib/quiz-schema";

const MODEL = "claude-sonnet-5";

const TOOL_NAME = "emit_quiz_pack";

const quizPackJsonSchema: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "Short title for the whole quiz pack" },
    rounds: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description:
              "A short, distinct round name — never just the ordinal (not 'Round 1'). " +
              "The UI already numbers rounds, so this is the name shown next to that number, " +
              "e.g. 'Warm-Up', 'Music Bingo', 'Around the World'.",
          },
          category: { type: "string", description: "e.g. '19th-Century History'" },
          questions: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                answer: { type: "string" },
                points: { type: "integer", minimum: 1, maximum: 10 },
                type: {
                  type: "string",
                  enum: ["TEXT", "MULTIPLE_CHOICE"],
                  description:
                    "Almost always 'TEXT' (a free-text answer). Use 'MULTIPLE_CHOICE' only " +
                    "occasionally for variety, and only when paired with 'options'.",
                },
                options: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 2,
                  maxItems: 6,
                  description:
                    "Required when type is 'MULTIPLE_CHOICE', omitted otherwise. 2-6 short " +
                    "choices, in no particular order, one of which must exactly equal 'answer'.",
                },
              },
              required: ["text", "answer"],
            },
          },
        },
        required: ["title", "category", "questions"],
      },
    },
  },
  required: ["title", "rounds"],
};

export async function generateQuizPack(userPrompt: string): Promise<GeneratedPack> {
  const anthropic = getAnthropicClient();

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system:
      "You are a pub quiz question setter. Given a request describing the desired " +
      "rounds and topics, produce a complete, well-researched quiz pack. Each question " +
      "must have a single unambiguous factual answer. Vary difficulty within each round " +
      "from easy to hard. Do not repeat questions or trivia facts across rounds. Most " +
      "questions should be free-text; sprinkle in the occasional multiple-choice question " +
      "for variety, never more than one or two per round. Call the " +
      `${TOOL_NAME} tool exactly once with the full pack.`,
    tools: [
      {
        name: TOOL_NAME,
        description: "Emit a complete generated quiz pack.",
        input_schema: quizPackJsonSchema,
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Model did not return structured quiz data");
  }

  const parsed = generatedPackSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(`Generated quiz pack failed validation: ${parsed.error.message}`);
  }

  return parsed.data;
}
