# Handoff — 2026-09-08

Live: https://pub-quiz-trivia-night-automation-hu.vercel.app
Repo: https://github.com/privlin-lgtm/pub-quiz-trivia-night-automation-hub (branch `master`, Vercel deploys on push)

## Where things stand

Production runs `b59a993` (pack export/import) and is healthy. Three commits sit
on local `master` ahead of `origin/master`, not yet pushed:

| Commit | What |
|---|---|
| `c5293de` | "Coaster" brand mark: new favicon set, `BrandMark.tsx`, header logo (committed from another session) |
| `1a51206` | Installable PWA: `src/app/manifest.ts`, theme colour, icon set wired, `e2e/pwa.spec.ts` |
| `d468d06` | Cross-check note appended to `docs/portfolio-readiness.md` (from the studio-site session) |

Push when ready. A push triggers a Vercel build; the last four pushes all
built green in about 35 seconds.

```bash
git push origin master
```

Working tree is clean. `.env.local` (gitignored) holds the current `ADMIN_TOKEN`.

## Shipped in the 2026-09-07/08 sessions

All verified on production unless noted.

- **Vercel build and Turso migration.** Build script is
  `prisma generate && prisma migrate deploy && next build`, so a stale
  generated client and an unapplied migration can no longer break a deploy.
- **Generation 502 fixed.** A multiple-choice question with a bad option set
  now degrades to free text instead of rejecting the whole pack
  (`src/lib/quiz-schema.ts`).
- **`ADMIN_TOKEN` set and rotated.** `DELETE /api/packs/[id]` returns 401
  without the `x-admin-token` header. Token was rotated via the Vercel CLI
  without ever printing the value; it lives in Vercel (Production and
  Preview) and in local `.env.local`.
- **Flaky `tie-ending.spec.ts` fixed.** The six-question loop now drives
  answers and host transitions through the API; browsers are used only for
  join and the ENDED screens. 23s to 5s, 10/10 on `--repeat-each 5`.
- **Team answer draft reset** when the host advances (PR #2, from a
  background session).
- **QR join link** on the host lobby: encodes `<origin>/play?code=XXXXX`,
  and `/play` prefills the code from the query string.
- **Pack export/import** as a portable JSON file: "Export JSON" on the pack
  editor, "Import pack" on `/packs`. Format `pub-quiz-pack` v1, ids
  stripped, host-approved alternate answers kept. Import is rate limited
  like seed and does not count against the free-tier generation cap.
- **Installable PWA** (not yet deployed, see above). Manifest, theme colour,
  maskable icon. No service worker on purpose: the live session is polling.

## How to verify

```bash
npm run test               # unit, 82 tests
npm run test:integration   # 70 tests, throwaway prisma/test.db
npm run test:e2e           # 6 specs, throwaway prisma/e2e.db, dev server on 4517
npx tsc --noEmit -p . && npx eslint src e2e scripts
npm run screenshots        # regenerates docs/screenshots/*.png
```

Production smoke used throughout the session:

```bash
B=https://pub-quiz-trivia-night-automation-hu.vercel.app
curl -s -o /dev/null -w "%{http_code}\n" $B/
curl -s -o /dev/null -w "%{http_code}\n" $B/api/packs
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE $B/api/packs/x   # expect 401
```

## Gotchas learned this session

- **`next dev` refuses a second instance** in the same project directory,
  even on a different port. Playwright's e2e server (4517) and the Browser
  pane preview (3000) cannot run at the same time. Run e2e, then preview.
- **Local `.env` has `DATABASE_URL="file:./dev.db"`.** With the libSQL
  adapter that resolves against the process cwd, so the root-level `dev.db`
  is the one the dev server uses, not `prisma/dev.db`. It was unmigrated
  until this session; if `/packs` 500s with `no such table`, run
  `npx prisma migrate deploy`. Root `dev.db` is now gitignored.
- **Vitest excludes `**/.claude/**`.** Background sessions create git
  worktrees under `.claude/worktrees/`, and the root test run was picking
  up their spec files. Both vitest configs exclude that tree now.
- **Claude Code's Bash heredocs on this machine collapse `\\` to `\`.**
  A regex written as `\\s` inside a heredoc arrived as `\s` in the file,
  which in a JS string is just `s`. Use the Edit/Write tools for anything
  with escaped backslashes.
- **Screenshot script races.** `scripts/capture-screenshots.ts` now waits
  for the free-tier usage line on `/create` and for the QR on the host
  lobby before shooting; both were captured mid-load before.
- **Vercel CLI** is logged in as `privlin-lgtm` and the project is linked
  (`.vercel/`, gitignored). `vercel env add NAME production --force --sensitive < file`
  rotates a secret without echoing it. `vercel env add` appended duplicate
  lines to `.gitignore` once; reverted.
- **Playwright `getByRole("alert")`** matches Next's dev overlay region as
  well as the app's own alert; filter by text.

## Open items

- **Session `3SBV6`** sits in the production database in LOBBY, created for
  a live QR check. Harmless. There is no session cleanup or TTL (known
  limitation in `claude/improvement-roadmap.md`).
- **Studio site** (`Projects/Yanshuf`): restore the live-demo button and set
  the Pub Quiz card status back to "Live". Recorded in
  `docs/portfolio-readiness.md`.
- **`npm audit`** still reports 3 high findings in the dev-only
  `prisma` → `@prisma/config` → `deepmerge-ts` chain; no fix without
  `prisma@8` RC.

## Next per the plan

`claude/monetization-buildout-plan.md`, build order step 3: Lemon Squeezy
checkout, webhook, pricing page. Blocked on a Lemon Squeezy account, store,
product, API key and webhook secret being set as Vercel env vars. The
`Creator` model and free-tier cap (step 2) are already live. Step 5 (QR,
PWA) is done except for pushing `1a51206`.
