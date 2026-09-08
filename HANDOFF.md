# Handoff — 2026-09-08

Live: https://pub-quiz-trivia-night-automation-hu.vercel.app
Repo: https://github.com/privlin-lgtm/pub-quiz-trivia-night-automation-hub (branch `master`, Vercel deploys on push)

## Where things stand

Local `master` is in sync with `origin/master` at `4e0ee66`, and production
runs that commit (deployment `2b1sizfft`, 2026-09-08 13:43). The earlier
`b98fab4` smoke (home, `/api/packs`, `/manifest.webmanifest`, all six icon
and favicon URLs 200, manifest link, apple-touch-icon and theme-color meta
present in the head) still holds; the default-brief generation path was
verified on `4e0ee66` (see below). Working tree is clean apart from this
file. `.env.local` (gitignored) holds the current `ADMIN_TOKEN`.

Another Claude session has been committing to this repo concurrently
(brand mark `c5293de`, PR #2, the readiness cross-check `d468d06`, and an
edit to this file). Run `git fetch` and `git status` before assuming the
tree matches what the last message in any one session said.

`c5293de` itself: applied the design-provided icon pack
(`Favicon and branding mark options.zip`, delivered as a chat attachment,
not committed) — favicon, App Router `icon.png`/`apple-icon.png`, two
`public/` PWA sizes, and the `BrandMark.tsx` header logo swapped in for
the old amber dot. Verified by running the dev server in the Browser pane
and reading back the rendered header before committing. The source zip
was deleted after extraction; nothing in the repo depends on it.

## Shipped in the 2026-09-07/08 sessions

All verified on production unless noted.

- **Default-brief generation fixed (2026-09-08 afternoon), three defects.**
  `9565e01`: `maxDuration = 60` on `POST /api/packs/generate` (platform
  default 10s; a four-round generation takes 20–28s) and the `/create` client
  no longer `JSON.parse`s a `text/plain` gateway error. `4e0ee66`: the model
  omits the top-level pack `title` about two runs in five, and
  `generatedPackSchema` was rejecting the whole pack for it — now derives a
  title from the round titles. Verified 5/5 on production including one real
  browser click through the wizard; full evidence in
  `docs/portfolio-readiness.md` "Closed 2026-09-08 afternoon". Production
  smoke for this path (rate limit is 5 per 10 min per IP, and each run
  spends a real Anthropic call):

  ```bash
  curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" -X POST -H "Content-Type: application/json" \
    -d '{"prompt":"A Friday-night pub quiz: four rounds covering 90s music, UK geography, movie quotes, and a picture-round-style general knowledge closer. Keep answers short and pub-friendly."}' \
    $B/api/packs/generate   # expect 201 in 20-30s
  ```
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
- **Installable PWA.** Manifest, theme colour, maskable icon, using the
  "Coaster" brand-mark icon set. No service worker on purpose: the live
  session is polling.

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
- **A fresh git worktree here has no `node_modules`, and a junction to the
  main checkout's copy does not work** — Turbopack aborts with `Symlink
  [project]/node_modules is invalid, it points out of the filesystem root`.
  Run `npm ci && npx prisma generate` inside the worktree (about two
  minutes). Playwright also reuses any dev server already on port 4517
  (`reuseExistingServer` outside CI), so a stray server from another
  session can silently test old code.
- **Sensitive Vercel env vars cannot be pulled.** `vercel env pull` writes
  a placeholder for anything added with `--sensitive` (every secret here),
  so `ANTHROPIC_API_KEY` is not obtainable locally and the local `.env`
  value is empty. Anything that needs a real generation must run against
  production (budget: rate limit 5 per 10 min per IP, real API credit per
  call) or on a preview deploy. `vercel logs <url>` only streams from the
  moment it starts — open it in the background *before* firing the request
  whose error you want to read; `--json` lines carry `level`, `message`
  and the route.
- **Ad-hoc TypeScript scripts outside the repo tree** (e.g. in a scratch
  directory) cannot resolve the repo's `node_modules` and, as `.ts`, hit
  `Top-level await is currently not supported with the "cjs" output format`.
  Use a `.mts` file, import repo modules by `file:///` URL, and run with
  `node --env-file=<file> --import tsx script.mts` from the repo root.
- **A worktree cannot be fully removed while the session that used it is
  open.** Claude Code keeps the worktree as its process cwd, so
  `git worktree remove` fails with `Permission denied` on the root
  directory. Delete the contents, `git worktree prune`, and `rmdir` the
  empty root after the session closes.

## Open items

- **Session `3SBV6`** sits in the production database in LOBBY, created for
  a live QR check. Harmless. There is no session cleanup or TTL (known
  limitation in `claude/improvement-roadmap.md`).
- **Studio site** (`Projects/Yanshuf`): restore the live-demo button and set
  the Pub Quiz card status back to "Live". The gate that page set for itself
  (default brief generates in a real browser) was met on 2026-09-08
  afternoon; see `docs/portfolio-readiness.md`. The button was restored once
  already on the morning's premature all-clear and reverted within the hour —
  this time the evidence includes a browser run on the deployed commit.
- **Verification packs** from the 2026-09-08 smoke runs (about ten
  four-round packs titled "Friday Night Lights…" / "Friday Night Fever Quiz")
  sit in the production database. Harmless; delete via
  `DELETE /api/packs/[id]` with `x-admin-token` if the `/packs` list gets
  noisy.
- **`npm audit`** still reports 3 high findings in the dev-only
  `prisma` → `@prisma/config` → `deepmerge-ts` chain; no fix without
  `prisma@8` RC.
- **Empty `.claude/worktrees/sad-brattain-23a4d3/`** left behind by the PR #2
  session (cwd lock, see Gotchas). Branch and worktree registration are
  already gone; `rmdir` it from the main checkout once that session is
  closed.

## Next per the plan

`claude/monetization-buildout-plan.md`, build order step 3: payment
checkout, webhook, pricing page. **Provider decision changed this session
(2026-09-08):** switching from the plan doc's original pick, Lemon
Squeezy, to **Paddle** — matches the user's other project (HebCal) and
this session has dedicated `paddle:*` skills available (`catalog-setup`,
`checkout-web`, `webhooks`, `sandbox-testing`, `customer-portal`,
`pricing-pages`). The plan doc (`claude/monetization-buildout-plan.md`,
"Payments") now says Paddle and carries the two open questions below.

Brainstorming for this step was started and then stopped mid-way
(architectural path — new subsystem, no existing flow to bound against).
Two clarifying questions are still open, asked but dismissed without an
answer:

1. **Paddle account scope** — reuse the same Paddle seller account as
   HebCal (new product/price under it) or a fully separate account for
   this app?
2. **Pricing interval(s)** at launch — monthly only (~$5), monthly +
   annual (~$5/mo or ~$25/yr, matches the plan doc's original framing), or
   annual only (~$25/yr)?

Resume by re-asking these two before proposing an approach. The `Creator`
model and free-tier cap (step 2) are already live (`prisma/schema.prisma`
`model Creator`, `src/lib/creator.ts`). No Paddle code, no `/pricing` page,
and no `paddle:*` skill has been invoked yet — nothing to roll back.
