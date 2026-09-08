import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import { canEditPack, creatorIdFromRequest, packOwnership } from "@/lib/pack-access";

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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The operator's admin token deletes anything; otherwise only the pack's
  // own creator may delete it. Both fail with the same 401 so a probe can't
  // tell an unowned id from a wrong token.
  if (!isAuthorizedAdmin(req)) {
    const [ownership, creatorId] = await Promise.all([packOwnership({ packId: id }), creatorIdFromRequest(req)]);
    if (!ownership || !canEditPack(ownership, creatorId)) {
      return NextResponse.json({ error: "Invalid admin token" }, { status: 401 });
    }
  }
  await db.quizPack.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
