import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const updateSchema = z.object({
  text: z.string().min(1).optional(),
  answer: z.string().min(1).optional(),
  points: z.number().int().min(1).max(10).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  }

  const question = await db.question
    .update({ where: { id }, data: parsed.data })
    .catch(() => null);
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }
  return NextResponse.json({ question });
}
