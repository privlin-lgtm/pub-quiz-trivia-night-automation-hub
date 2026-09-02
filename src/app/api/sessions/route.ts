import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateSessionCode } from "@/lib/codes";
import { z } from "zod";

const createSessionSchema = z.object({
  packId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const pack = await db.quizPack.findUnique({ where: { id: parsed.data.packId } });
  if (!pack) {
    return NextResponse.json({ error: "Pack not found" }, { status: 404 });
  }

  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateSessionCode();
    const existing = await db.session.findUnique({ where: { code: candidate } });
    if (!existing) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    return NextResponse.json({ error: "Could not allocate a session code" }, { status: 500 });
  }

  const session = await db.session.create({
    data: { packId: pack.id, code },
  });

  return NextResponse.json({ session }, { status: 201 });
}
