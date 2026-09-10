import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminTokenConfigured, isAuthorizedAdmin } from "@/lib/admin-auth";
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
  //
  // isAuthorizedAdmin fails closed when ADMIN_TOKEN is unset (see its
  // comment), so there is no configuration of this deployment in which the
  // ownership check below is skipped. isAdminTokenConfigured() is kept in
  // front of it to state that intent at the call site rather than leaving it
  // to be re-derived from the helper.
  const adminOverride = isAdminTokenConfigured() && isAuthorizedAdmin(req);
  if (!adminOverride) {
    const [ownership, creatorId] = await Promise.all([packOwnership({ packId: id }), creatorIdFromRequest(req)]);
    if (!ownership || !canEditPack(ownership, creatorId)) {
      return NextResponse.json({ error: "Invalid admin token" }, { status: 401 });
    }
  }
  await db.quizPack.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
