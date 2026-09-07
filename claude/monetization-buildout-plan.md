# Build Plan — Ad-Funded / Freemium Web App

Decision made: ship as a free, ad-light/freemium web app (not a desktop portfolio piece, not a build-out to compete for bar/venue subscriptions). Positioning: "Free to run your night, ad-supported to build it" — never monetize the live show itself, only the edges of the funnel. This is the plan to hand to Claude Code as a Phase 1 "give me the full plan, don't build yet" prompt.

## Golden rule

No ads, no paywall friction, nothing monetization-related ever touches `/host/[code]` or `/play/[code]` while a question is active. That live moment (often cast to a TV, played on phones in front of a room) is the product's word-of-mouth engine — degrading it to make a few cents of ad revenue directly undermines the Phase 9 distribution plan. All monetization sits at the edges: pack generation, the packs list, PDF export.

## Monetization model

- **Free tier**: ~2 AI-generated packs per rolling 30 days. The static seeded demo pack (`/api/packs/seed`) stays unlimited and free forever — it costs nothing (no Anthropic call) and is the top-of-funnel try-before-you-commit path.
- **Ad placement**: light ad slots on three pages only — the pack-generation wait screen, `/packs` (pack list), and the PDF export/print-preview page. Never on host dashboard or team portal.
- **Pro tier** (~$4-6/mo or ~$25/yr, impulse-buy pricing, not B2B pricing): removes the generation cap and the ad slots above. Later nice-to-haves to hang off this tier: extra PDF themes, custom branding on the presenter script/PDF.

## Schema changes

New `Creator` model, identified by a long-lived httpOnly cookie (not full email/password auth for v1 — proportionate to actual trust model, same reasoning the codebase already applies in `rate-limit.ts`/`admin-auth.ts`; gameable by clearing cookies, acceptable until there's evidence Pro demand justifies real accounts):

```prisma
model Creator {
  id                     String   @id @default(cuid())
  deviceKey              String   @unique
  plan                   String   @default("FREE") // FREE | PRO
  packsGeneratedInPeriod Int      @default(0)
  periodStartedAt        DateTime @default(now())
  paymentCustomerId      String?
  subscriptionId         String?
  createdAt              DateTime @default(now())
  packs                  QuizPack[]
}
```

`QuizPack.creatorId` — nullable, so existing/seeded packs aren't orphaned. `packs/generate/route.ts` gets a `canGenerate(creator)` check *before* the Anthropic call (reject early — don't spend API credit on a request you're about to refuse).

## Payments

Lemon Squeezy (Merchant of Record) over Stripe — absorbs cross-border VAT/sales-tax registration for a niche that Phase 0 research confirmed sells across UK/US/EU. One webhook route, signature-verified, flips `Creator.plan` on subscription created/renewed/cancelled events.

## Infra fixes that stop being optional once this is a real public deploy

Both already flagged in the earlier code review — now load-bearing, not nice-to-haves:
- **Swap SQLite → Turso/libSQL.** Smallest-diff option against the current Prisma schema; Postgres (Supabase/Neon) is the alternative if heavier relational needs show up later.
- **Replace the in-memory rate limiter with Upstash Redis.** A public ad-funded app is exactly the abuse target that limiter exists for, and it silently no-ops across serverless instances today.

## Mobile extras

Web manifest + icons + a minimal service worker so `/play` supports "Add to Home Screen" — near-free since the team portal is already mobile-first. No native wrapper (Capacitor/Tauri) yet; that reopens app-store billing policy for no clear payoff at this stage.

## Build order

1. Turso swap + Redis rate limiter (infra only, no user-facing change; unblocks any real deploy).
2. `Creator` model + cookie identity + generation cap + "2/2 used this month" UI state — ship and verify the cap doesn't break the core flow before payments exist.
3. Lemon Squeezy checkout + webhook + pricing page.
4. Ad slots on the three non-live pages, gated to `plan === FREE`.
5. PWA manifest + one or two cheap "wow" features from the earlier improvement roadmap (QR code next to the join code, a per-question timer) — prioritized here specifically because they're also the most screenshot/demo-able features for the Phase 9 TikTok-style content plan.

See also: `improvement-roadmap.md` (full code review) and `workflow-audit-phase0-onward.md` (Phase 0-10 audit that led to this decision).
