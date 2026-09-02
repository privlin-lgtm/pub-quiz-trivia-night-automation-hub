import { NextRequest, NextResponse } from "next/server";
import { createPackFromGenerated } from "@/lib/create-pack";
import { generateQuizPack } from "@/lib/generate-pack";
import { wizardRequestSchema } from "@/lib/quiz-schema";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = wizardRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  let generated;
  try {
    generated = await generateQuizPack(parsed.data.prompt);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const pack = await createPackFromGenerated(generated, parsed.data.prompt);

  return NextResponse.json({ pack }, { status: 201 });
}
