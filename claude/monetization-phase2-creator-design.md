# Monetization Phase 2 — Creator Identity + Generation Cap

Design for build-order step 2 from `monetization-buildout-plan.md`: a cookie-identified
`Creator` model with a rolling free-tier generation cap. No payments yet (step 3,
Lemon Squeezy, is a separate follow-on phase) — `plan` exists on the schema now so step 3
only needs to *flip* it, not add it.

## Schema

```prisma
model Creator {
  id                     String     @id @default(cuid())
  deviceKey              String     @unique
  plan                   String     @default("FREE") // FREE | PRO
  packsGeneratedInPeriod Int        @default(0)
  periodStartedAt        DateTime   @default(now())
  createdAt              DateTime   @default(now())
  packs                  QuizPack[]
}
```

`QuizPack.creatorId String?` — nullable, so existing/seeded packs stay orphaned rather
than requiring a backfill.

`paymentCustomerId`/`subscriptionId` (present in the original monetization plan's schema
sketch) are deliberately **left out** of this phase's migration — they'd be dead columns
until Lemon Squeezy exists. Added in the payments phase instead.

## Cookie identity (`src/lib/creator.ts`)

- Cookie name: `pq_creator`.
- Value: an opaque random id (`crypto.randomUUID()`) used purely as the `deviceKey`
  lookup key — never the Creator row's own `id` (same separation the codebase already
  applies to host/team session tokens).
- Attributes: `httpOnly: true`, `secure` in production only, `sameSite: "lax"`,
  `path: "/"`, `maxAge` 1 year.
- `getOrCreateCreator(req)` — reads `pq_creator`; if a matching `Creator` row exists,
  returns it. If the cookie is missing, **or** present but stale (no matching row — e.g.
  DB reset), mints a fresh `deviceKey`, creates a `Creator` row, and returns
  `{ creator, cookieToSet }` so the caller can attach the `Set-Cookie` header to its
  response. Called only from `/api/packs/generate` (lazy creation — never on a page
  visit that doesn't generate).
- `getCreatorReadOnly(req)` — reads the cookie and looks up the row; returns `null` if
  either is missing. Never creates a row, never sets a cookie. Used by the status
  endpoint only.

## Generation cap logic (`src/lib/creator.ts`)

```ts
const FREE_LIMIT = 2;
const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

function withRolledPeriod(creator: Creator): Creator {
  const expired = Date.now() - creator.periodStartedAt.getTime() > PERIOD_MS;
  return expired
    ? { ...creator, packsGeneratedInPeriod: 0, periodStartedAt: new Date() }
    : creator;
}

function canGenerate(creator: Creator): boolean {
  return creator.plan === "PRO" || withRolledPeriod(creator).packsGeneratedInPeriod < FREE_LIMIT;
}
```

The roll is computed in memory wherever it's needed (cap checks, the status endpoint)
but only **persisted** to the DB at the moment of an actual successful generation — a
read-only check never writes, avoiding a DB write on every page load or status poll.

Rolling reset (not a timestamped log): matches the schema's own field names
(`packsGeneratedInPeriod` + `periodStartedAt`) and is proportionate to a 2/month soft
cap whose purpose is nudging toward Pro, not precise metering. The "cliff" edge case
(hit the cap right before reset, get 2 more right after) is an accepted, harmless
trade-off at this scale.

## `/api/packs/generate` route changes

1. `getOrCreateCreator(req)` at the top of the handler.
2. Compute the rolled period in memory. If `!canGenerate`, return **403** with
   `{ error: "...", packsGeneratedInPeriod, limit: FREE_LIMIT }` — **before** the
   Anthropic call (reject early; don't spend API credit on a request about to be
   refused).
3. On a successful generation, in the same transaction/update as creating the pack:
   `db.creator.update` with the rolled `packsGeneratedInPeriod + 1` /
   `periodStartedAt`, and set the new pack's `creatorId`.
4. The `Set-Cookie` header is attached to the response in every case (cap-exceeded
   included) — a capped-out first-time visitor still gets their identity cookie for
   next time.

## New status endpoint (`src/app/api/creator/status/route.ts`)

```
GET → { plan: "FREE" | "PRO", packsGeneratedInPeriod: number, limit: number }
```

No cookie or no matching row → the fresh-visitor default
`{ plan: "FREE", packsGeneratedInPeriod: 0, limit: 2 }`, no DB write. Uses
`withRolledPeriod` read-only, so a returning creator whose period has expired sees
`0/2` immediately, even before their next generation persists the reset.

## `/create` page UI changes (`src/app/create/page.tsx`)

- `useEffect` on mount: `fetch("/api/creator/status")`, store `{ used, limit, plan }`.
- Below the page heading: `"{used}/{limit} free packs used this month"` — hidden
  entirely when `plan === "PRO"`.
- When `used >= limit` and not PRO: disable the submit button, change its label (e.g.
  "Free limit reached"), and show a plain-text line about upgrading (no link yet — Pro
  checkout doesn't exist until the Lemon Squeezy phase).
- Belt-and-suspenders: a `403` from the generate call itself (cap could be hit between
  page load and submit, e.g. two tabs) updates the same state from the error response
  body, rather than showing a generic error.

## Testing plan

- Unit (`src/lib/creator.test.ts`): `withRolledPeriod` (expired vs not-yet-expired
  boundary), `canGenerate` (FREE under/at/over limit, PRO always true).
- Integration: `/api/packs/generate` — first-time visitor gets a `Set-Cookie` +
  succeeds; a Creator at the limit gets `403` with no Anthropic call attempted
  (assert via a call-count spy on the generation mock, matching the existing
  integration test pattern for this route); a Creator past their rolled period
  generates successfully and their DB row shows the reset count of `1`, not `3`.
  `/api/creator/status` — no cookie → default response, no DB row created; existing
  Creator → their real counts; expired-period Creator → rolled `0` without a DB write
  (assert row unchanged after the call).
- No e2e changes needed — the existing host/team Playwright flow doesn't touch
  `/create`.
