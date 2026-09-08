import { NextRequest, NextResponse } from "next/server";
import { createPackFromGenerated } from "@/lib/create-pack";
import { getOrCreateCreator } from "@/lib/creator";
import { PACK_FILE_FORMAT, PACK_FILE_VERSION, packFileSchema } from "@/lib/pack-file";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // No AI call, so it doesn't count against the free-tier generation cap —
  // but it's an unauthenticated write, so it gets the same ceiling as seed.
  const limited = await rateLimit(req, "packs:import", { limit: 20, windowMs: 10 * 60 * 1000 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many packs imported recently. Please wait a bit and try again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "That isn't a JSON pack file." }, { status: 400 });
  }

  const parsed = packFileSchema.safeParse(body);
  if (!parsed.success) {
    const { format, version } = body as { format?: unknown; version?: unknown };
    const error =
      format !== PACK_FILE_FORMAT
        ? `That isn't a pack file exported from this app (expected format "${PACK_FILE_FORMAT}").`
        : version !== PACK_FILE_VERSION
          ? `This pack file is version ${String(version)}; this app reads version ${PACK_FILE_VERSION}.`
          : "This pack file is missing or has invalid questions. Re-export it and try again.";
    return NextResponse.json({ error }, { status: 400 });
  }

  // The importer owns the copy — this is how a visitor turns a shared
  // (ownerless) pack into one they can edit. Creating a Creator row here is
  // the same cost as on generate, and only happens on a successful parse.
  const { creator, setCookieOn } = await getOrCreateCreator(req);
  const { title, prompt, rounds } = parsed.data;
  const pack = await createPackFromGenerated({ title, rounds }, prompt ?? `Imported pack: ${title}`, creator.id);
  const res = NextResponse.json({ pack }, { status: 201 });
  setCookieOn(res);
  return res;
}
