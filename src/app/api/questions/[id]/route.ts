import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isValidOptionSet, parseOptions, QUESTION_TYPE, serializeOptions } from "@/lib/question-types";
import type { Prisma } from "@prisma/client";

const updateSchema = z.object({
  text: z.string().min(1).optional(),
  answer: z.string().min(1).optional(),
  points: z.number().int().min(1).max(10).optional(),
  type: z.enum([QUESTION_TYPE.TEXT, QUESTION_TYPE.MULTIPLE_CHOICE]).optional(),
  options: z.array(z.string().min(1)).max(6).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  }

  const existing = await db.question.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const { type, options: rawOptions, ...rest } = parsed.data;
  const effectiveType = type ?? existing.type;
  const effectiveAnswer = rest.answer ?? existing.answer;
  const effectiveOptions = rawOptions ?? parseOptions(existing.options);

  const data: Prisma.QuestionUpdateInput = { ...rest };
  if (type !== undefined) data.type = type;

  // Re-derive `options` from whatever the resulting state is, on every PATCH
  // — not just when type/options were touched — so a partial edit (say, just
  // `answer`) can never leave a multiple-choice question's answer out of
  // step with its own option list.
  if (effectiveType === QUESTION_TYPE.MULTIPLE_CHOICE) {
    if (!isValidOptionSet(effectiveOptions, effectiveAnswer)) {
      return NextResponse.json(
        { error: "Multiple-choice questions need at least 2 distinct options, including the answer" },
        { status: 400 }
      );
    }
    data.options = serializeOptions(Array.from(new Set(effectiveOptions.map((o) => o.trim()).filter(Boolean))));
  } else if (type !== undefined) {
    // Switching to (or re-confirming) TEXT clears any leftover options.
    data.options = null;
  }

  const question = await db.question.update({ where: { id }, data }).catch(() => null);
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }
  return NextResponse.json({
    question: { ...question, options: parseOptions(question.options) },
  });
}
