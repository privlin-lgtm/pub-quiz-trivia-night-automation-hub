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
  // isAuthorizedAdmin alone is not enough to gate on here: with no
  // ADMIN_TOKEN configured it returns true for *any* request (that's the
  // right default for a solo local-dev checkout with nothing to protect
  // against), which would skip the ownership check below entirely and let
  // anyone delete anyone's pack the moment this is deployed without the
  // token set. isAdminTokenConfigured() makes the override opt-in: no token
  // configured means no admin bypass, full stop, and ownership decides.
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
