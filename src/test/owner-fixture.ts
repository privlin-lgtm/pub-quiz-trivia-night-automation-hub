import { COOKIE_NAME } from "@/lib/creator";
import { db } from "@/lib/db";

/**
 * Pack edit routes are gated on the `pq_creator` cookie matching the pack's
 * `creatorId` (src/lib/pack-access.ts). Integration suites that mutate packs
 * create one owner per file and thread it through: `owner.id` into
 * createPackFromGenerated, `owner.cookieHeader` onto every write request.
 */
export async function testOwner() {
  const deviceKey = `test-owner-${Math.random().toString(36).slice(2)}`;
  const creator = await db.creator.create({ data: { deviceKey } });
  return {
    id: creator.id,
    deviceKey,
    cookieHeader: { cookie: `${COOKIE_NAME}=${deviceKey}` } as Record<string, string>,
  };
}
