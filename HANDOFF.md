# Handoff — 2026-09-09

Live: https://pub-quiz-trivia-night-automation-hu.vercel.app
Repo: https://github.com/privlin-lgtm/pub-quiz-trivia-night-automation-hub (branch `master`, Vercel deploys on push)

## Where things stand

Local `master` is in sync with `origin/master` at `beca9aa`. Production runs
that commit; the last code change was `5eb1eba` (deployment `41ufcme5e`,
2026-09-08 15:14), and `beca9aa` on top of it is docs only. `.env.local`
(gitignored) holds the current `ADMIN_TOKEN`.

The working tree is **not** clean, and neither item is from the session that
wrote this file:

- `docs/portfolio-readiness.md` has an uncommitted 38-line section, "Closed
  again 2026-09-08 — verified by hand this time", written by the session that
  restored the studio-site link. It records a hand-run of the default brief
  (4 rounds, 40 questions, under 20s) and explains that the `2/2 free packs`
  cap is per-visitor cookie, not global. It reads correctly against the
  deployed code. Commit it as-is, or let that session do so.
- `Favicon and branding mark options.zip` (125 KB, root of the repo, dated
  2026-09-09 00:00) is untracked. This is the design icon pack that
  `c5293de` already applied and whose first copy was deleted after
  extraction. Nothing in the repo depends on it; delete it rather than
  commit it.

Two or three Claude sessions have been committing to this repo at once over
the last two days. Run `git fetch` and `git status` before assuming the tree
matches what the last message in any one session said, and check `git diff`
on any modified file before committing it as your own.

## Shipped 2026-09-07 → 09, newest first

All verified on production unless noted.

- **Pack ownership** (`5eb1eba`). A pack is editable only by the holder of
  the `pq_creator` cookie whose Creator id matches `QuizPack.creatorId`
  (`src/lib/pack-access.ts`). `GET /api/packs` and `/packs` list ownerless
  packs plus the visitor's own, never another creator's. `POST /api/questions`,
  `PATCH`/`DELETE /api/questions/[id]`, `DELETE /api/rounds/[id]` and
  `POST /api/rounds/[id]/move` return
  `403 {"error":"You can only edit packs you created"}` for anyone else, after
  the existing 404 check. `DELETE /api/packs/[id]` accepts the admin token or
  the owner. Ownerless packs (`creatorId` null: the seeded demo pack, anything
  older than the Creator model) are read-only for everyone; the editor shows
  a note pointing at Export JSON → Import, and import now stamps the importer
  as owner. Reads by id stay open so sessions, PDF, print and export keep
  working for the demo path. Before this, any visitor could rewrite or delete
  any pack. Verified on production: cookie-less list returns only the demo
  pack; all four edit routes 403 on it; delete 401; `GET` and PDF 200; in the
  browser the demo pack renders read-only and an owned pack renders with full
  controls.
- **Default-brief generation** (`9565e01`, `4e0ee66`). Three defects:
  `maxDuration = 60` on the generate route (platform default was 10s, a
  four-round generation takes 20–28s); the `/create` client checks
  `content-type` before `res.json()`; and `generatedPackSchema` now derives
  a pack title from the round titles when the model omits one (it did so
  about two runs in five, sinking the whole 40-question pack). Verified 5/5
  on production including a real browser click through the wizard. Evidence
  in `docs/portfolio-readiness.md`, "Closed 2026-09-08 afternoon".
- **Docs brought in line** (`6b9646d`, `49a2e1f`, `beca9aa`). README has the
  function-timeout note, the two degrade-instead-of-reject validation rules,
  and a pack-ownership security note. `claude/improvement-roadmap.md` has a
  status block marking what has shipped since the review. The plan doc's
  payments provider is Paddle (see "Next").
- **Vercel build and Turso migration.** Build is
  `prisma generate && prisma migrate deploy && next build`.
- **Generation 502 for a bad multiple-choice option set** degrades that
  question to free text instead of rejecting the pack (`101a4c7`).
- **`ADMIN_TOKEN` set and rotated** via the Vercel CLI without printing it.
- **QR join link**, **pack export/import** (`pub-quiz-pack` v1), **installable
  PWA**, **brand mark and icon set** (`c5293de`), **team answer draft reset**
  on advance (PR #2).

## How to verify

```bash
npm run test               # unit, 87 tests
npm run test:integration   # 91 tests, throwaway prisma/test.db
npm run test:e2e           # 6 specs, throwaway prisma/e2e.db, dev server on 4517 — see tie-ending below
npx tsc --noEmit -p . && npx eslint src e2e scripts
npm run screenshots        # regenerates docs/screenshots/*.png
```

Production smoke (Git Bash or the Claude terminal, any folder):

```bash
B=https://pub-quiz-trivia-night-automation-hu.vercel.app
curl -s -o /dev/null -w "%{http_code}\n" $B/
curl -s $B/api/packs                                                  # cookie-less: only "Friday Night Demo Pack"
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE $B/api/packs/x     # expect 401
# default brief, spends a real Anthropic call, rate limit 5 per 10 min per IP:
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" -X POST -H "Content-Type: application/json" \
  -d '{"prompt":"A Friday-night pub quiz: four rounds covering 90s music, UK geography, movie quotes, and a picture-round-style general knowledge closer. Keep answers short and pub-friendly."}' \
  $B/api/packs/generate                                               # expect 201 in 20-30s
```

## Open items

- **`e2e/tie-ending.spec.ts` exceeds the 30s test timeout, every run.** It
  is not broken: with `--timeout 120000` it passes in 53.9s, and it fails the
  same way on the code before the ownership change. But the 2026-09-08
  morning handoff recorded it at about 5s, 10/10, so something made the
  local e2e path roughly ten times slower in between. Ruled out: another dev
  server on port 3000 (gone now, still fails), and the local DB (Playwright
  pins `DATABASE_URL` to `prisma/e2e.db`; `.env` has no Upstash keys). Not
  yet checked: the dev server's per-route Turbopack compile time on this
  machine, and whether the other five specs got slower too (they pass, at
  1.6 min for the suite). Find the cause before raising the timeout.
- **Studio site** (`Projects/Yanshuf`): the user reported the live-demo
  button was being restored on 2026-09-09. Confirm the Pub Quiz card says
  "Live" and the link resolves. The button was restored once on the
  2026-09-08 morning's premature all-clear and reverted within the hour.
- **Uncommitted readiness-doc section and the stray zip** — see "Where things
  stand".
- **Paywall copy.** The free-cap screen says "Upgrade to Pro for unlimited
  packs, coming soon". The other session flagged it as a portfolio tell.
  Goes away with the Paddle work.
- **Session `3SBV6`** sits in the production database in LOBBY from a QR
  check. Harmless. No session or pack TTL exists.
- **Verification packs** from the 2026-09-08 smoke runs (about ten, titled
  "Friday Night Lights…" / "Friday Night Fever Quiz") are in the production
  database. They are owned by throwaway curl creators, so nobody sees them
  in `/packs` any more. Delete via `DELETE /api/packs/[id]` with
  `x-admin-token` if the table needs tidying.
- **`npm audit`** reports 3 high findings in the dev-only
  `prisma` → `@prisma/config` → `deepmerge-ts` chain; no fix without
  `prisma@8` RC.
- **`.claude/worktrees/sad-brattain-23a4d3/`** is the cwd of the session that
  wrote this file (its worktree registration is already gone, so git
  commands there act on the main checkout). `rmdir` it from the main
  checkout once that session is closed.

## Gotchas learned across these sessions

- **`next dev` refuses a second instance** in the same project directory,
  even on a different port. Playwright's e2e server (4517) and a Browser
  pane preview (3000) cannot run at the same time.
- **Playwright reuses any server already on 4517** (`reuseExistingServer`
  outside CI), so a stray dev server from another session silently tests old
  code.
- **Local `.env` has `DATABASE_URL="file:./dev.db"`** resolving against the
  process cwd, so the root-level `dev.db` (gitignored) is the dev server's
  DB, not `prisma/dev.db`. If `/packs` 500s with `no such table`, run
  `npx prisma migrate deploy`.
- **`ANTHROPIC_API_KEY` is empty locally and cannot be pulled.** Every Vercel
  secret here was added `--sensitive`, and `vercel env pull` writes a
  placeholder for those. Anything that needs a real generation runs against
  production (5 per 10 min per IP, real credit per call) or a preview deploy.
- **`vercel logs <url>` streams only from the moment it starts** — open it
  in the background before firing the request whose error you want. Its
  `--json` lines carry `level`, `message` and the route.
- **`vercel ls` prints its table to stderr.** `2>/dev/null` hides it and a
  polling loop never matches. Use `2>&1`.
- **The Claude desktop Browser pane shares one profile across sessions.** The
  `pq_creator` cookie in it is the same for every session, so packs generated
  from it in one session show up as "yours" in another. Fine for checks;
  do not treat it as a fresh visitor. Use curl (no cookie) for the
  stranger's view.
- **Claude Code's auto-mode classifier** blocked reading the Vercel CLI auth
  token to call the REST API directly. `vercel project inspect`,
  `vercel inspect <url>` and `vercel ls` cover most of what that was for.
- **Vitest excludes `**/.claude/**`** so background-session worktrees do not
  leak spec files into the root run.
- **Claude Code's Bash heredocs on this machine collapse `\\` to `\`.** Use
  the Edit/Write tools for anything with escaped backslashes.
- **Ad-hoc TypeScript outside the repo tree** cannot resolve the repo's
  `node_modules` and, as `.ts`, hits `Top-level await is currently not
  supported with the "cjs" output format`. Use a `.mts` file, import repo
  modules by `file:///` URL, run `node --env-file=<file> --import tsx
  script.mts` from the repo root.
- **Playwright `getByRole("alert")`** matches Next's dev overlay as well as
  the app's alert; filter by text.
- **A fresh git worktree has no `node_modules`, and a junction to the main
  checkout's copy does not work** (Turbopack: `Symlink [project]/node_modules
  is invalid`). Run `npm ci && npx prisma generate` inside it.
- **A worktree cannot be removed while the session using it is open**
  (`Permission denied` on the root directory). Prune and `rmdir` after.
- **Vercel CLI** is logged in as `privlin-lgtm`, project linked (`.vercel/`,
  gitignored). `vercel env add NAME production --force --sensitive < file`
  rotates a secret without echoing it.

## Next per the plan

`claude/monetization-buildout-plan.md`, build order step 3: **Paddle**
checkout, webhook, `/pricing` page (the plan doc's "Payments" section now
says Paddle and carries the reasoning). Step 2, the `Creator` model and
free-tier cap, is live; pack ownership (above) rides on the same cookie. No
Paddle code, no `/pricing` page, and no `paddle:*` skill has been invoked
yet; nothing to roll back.

This is architectural (a new subsystem), so it starts with brainstorming and
a spec. Two questions were asked and never answered; ask them first:

1. **Paddle account scope** — reuse the HebCal Paddle seller account (new
   product and price under it) or a separate account for this app?
2. **Pricing interval(s)** at launch — monthly only (~$5), monthly + annual
   (~$5/mo or ~$25/yr, the plan doc's framing), or annual only (~$25/yr)?

Before calling any of it "live", follow the global `~/.claude/CLAUDE.md`
checklist written after the Or Zarua payments incident: walk the real path
on the production domain as a new user with DevTools open, grep the deployed
bundle for every expected config value, use Vercel env type Config (not
legacy Secret) for publishable values, add a CSP test per third-party host,
never fail soft on a required integration, verify the schema in the
production DB, and verify the webhook revoke path live the same day as the
grant. The postmortem is at
`HebCal_Companion/docs/postmortem-2026-09-09-web-purchases-never-worked.md`.

After step 3: step 4, ad slots on the three non-live pages gated to
`plan === FREE`. Then the roadmap's still-open items (pack and session TTL,
round-by-round scores, team management, SSE for reveal latency).
