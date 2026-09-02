import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pack = await db.quizPack.findUnique({
    where: { id },
    include: {
      rounds: {
        orderBy: { index: "asc" },
        include: { questions: { orderBy: { index: "asc" } } },
      },
    },
  });
  if (!pack) {
    return NextResponse.json({ error: "Pack not found" }, { status: 404 });
  }
  return NextResponse.json({ pack });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.quizPack.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
