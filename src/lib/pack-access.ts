import type { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME } from "@/lib/creator";
import { db } from "@/lib/db";

/**
 * Pack ownership, keyed by the same `pq_creator` cookie the free-tier cap
 * uses. A pack is editable only by the Creator whose id matches
 * `QuizPack.creatorId`. Ownerless packs (`creatorId` null — the seeded demo
 * pack, anything created before the Creator model) are visible to everyone
 * and editable by no one; Export → Import is how a visitor takes an
 * editable copy. Reads by id stay open (unlisted, cuid ids) so sessions,
 * PDF, print and export keep working for the demo path.
 */

export const NOT_OWNER_MESSAGE = "You can only edit packs you created";

/** Prisma filter for the packs a visitor may see in a list. */
export function visiblePacksWhere(creatorId: string | null): Prisma.QuizPackWhereInput {
  return creatorId === null ? { creatorId: null } : { OR: [{ creatorId: null }, { creatorId }] };
}

/** Resolves a cookie value to a Creator id. Never creates a row. */
export async function creatorIdForDeviceKey(deviceKey: string | undefined): Promise<string | null> {
  if (!deviceKey) return null;
  const creator = await db.creator.findUnique({ where: { deviceKey }, select: { id: true } });
  return creator?.id ?? null;
}

export function creatorIdFromRequest(req: NextRequest): Promise<string | null> {
  return creatorIdForDeviceKey(req.cookies.get(COOKIE_NAME)?.value);
}

export function canEditPack(pack: { creatorId: string | null }, creatorId: string | null): boolean {
  return pack.creatorId !== null && creatorId !== null && pack.creatorId === creatorId;
}

type OwnerTarget = { packId: string } | { roundId: string } | { questionId: string };

/** Walks question → round → pack as needed. Null when the target row is gone. */
export async function packOwnership(target: OwnerTarget): Promise<{ packId: string; creatorId: string | null } | null> {
  if ("packId" in target) {
    const pack = await db.quizPack.findUnique({ where: { id: target.packId }, select: { id: true, creatorId: true } });
    return pack ? { packId: pack.id, creatorId: pack.creatorId } : null;
  }
  if ("roundId" in target) {
    const round = await db.round.findUnique({
      where: { id: target.roundId },
      select: { pack: { select: { id: true, creatorId: true } } },
    });
    return round ? { packId: round.pack.id, creatorId: round.pack.creatorId } : null;
  }
  const question = await db.question.findUnique({
    where: { id: target.questionId },
    select: { round: { select: { pack: { select: { id: true, creatorId: true } } } } },
  });
  return question ? { packId: question.round.pack.id, creatorId: question.round.pack.creatorId } : null;
}

/**
 * For write routes. Returns a 403 response to send back, or null when the
 * caller owns the pack. Callers 404 on a missing row *before* this, so a
 * non-existent id never turns into a misleading "not yours".
 */
export async function requirePackOwner(req: NextRequest, target: OwnerTarget): Promise<NextResponse | null> {
  const [ownership, creatorId] = await Promise.all([packOwnership(target), creatorIdFromRequest(req)]);
  if (ownership && canEditPack(ownership, creatorId)) return null;
  return NextResponse.json({ error: NOT_OWNER_MESSAGE }, { status: 403 });
}
