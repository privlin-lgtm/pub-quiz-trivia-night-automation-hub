import { NextRequest, NextResponse } from "next/server";
import { createPackFromGenerated } from "@/lib/create-pack";
import { generateQuizPack } from "@/lib/generate-pack";
import { wizardRequestSchema } from "@/lib/quiz-schema";
import { rateLimit } from "@/lib/rate-limit";
import { MissingApiKeyError } from "@/lib/anthropic";

export async function POST(req: NextRequest) {
  // Each call spends real Anthropic API credit, so this is throttled
  // per-IP to bound the cost of a scripted abuse loop hitting a public URL.
  const limited = await rateLimit(req, "packs:generate", { limit: 5, windowMs: 10 * 60 * 1000 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many quiz packs generated recently. Please wait a bit and try again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

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
    if (err instanceof MissingApiKeyError) {
      // Not an upstream failure — nothing to hide, and "please try again"
      // would be actively misleading here since retrying can't help.
      return NextResponse.json(
        {
          error:
            "AI generation isn't configured on this server yet — set ANTHROPIC_API_KEY " +
            "in .env and restart, or use the demo pack (POST /api/packs/seed) instead.",
        },
        { status: 503 }
      );
    }
    // Log the real cause server-side; don't forward raw SDK/API error
    // internals (model names, request ids, etc.) to the client.
    console.error("Quiz pack generation failed:", err);
    return NextResponse.json(
      { error: "Couldn't generate a quiz pack right now. Please try again." },
      { status: 502 }
    );
  }

  const pack = await createPackFromGenerated(generated, parsed.data.prompt);

  return NextResponse.json({ pack }, { status: 201 });
}
