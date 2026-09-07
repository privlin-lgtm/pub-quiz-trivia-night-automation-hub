# Portfolio readiness — Pub Quiz Automation Hub

**Why this file exists.** This project is the lead (currently only) case study on
yanshufstudio.com, the studio site. It is the one thing a prospective client can
click. This file is the punch list that has to clear before that link is safe to
put in front of strangers. Written 2026-09-07.

Paste this into a fresh Claude Code session in this repo and work top-down.

---

## State as found (2026-09-07)

- `HEAD` = `103dcb9` "Add live demo link to README".
- Live URL responds and renders correctly: https://pub-quiz-trivia-night-automation-hu.vercel.app
  — headline "Pub Quiz Automation Hub", three CTAs (Generate a quiz pack /
  Manage your packs / Join as a team). Not a stub, not a build-failure page.
- **Working tree is dirty.** Modified and uncommitted:
  `src/app/host/[code]/page.tsx`, `src/app/play/page.tsx`,
  `src/components/Scoreboard.tsx`, `src/components/StatusBadge.tsx`,
  `src/lib/team-session.ts`, `package-lock.json`. Untracked: `HANDOFF.md`, `claude/`.
  So the deployed build is **behind** local work, and nobody knows if local work is good.
- **The test suite does not currently run.** `npm run test` dies at startup:
  `Error: Cannot find native binding` → `Cannot find module '@rolldown/binding-wasm32-wasi'`.
  This is the known npm optional-dependency bug, not a code failure — but it means
  nothing in this repo has actually been verified recently.
- `HANDOFF.md` flags that the full suite has not been re-run since the five
  commits that landed from the parallel Cursor session (`c03ee15`, `bc0b775`,
  `571b91d`, `18f4ec8`, `47a46e8` — timer/auto-reveal, multiple-choice,
  acceptable-answers matching, host round editing, and the Turso + Upstash migration).

---

## Task 1 — Get the test suite running again (blocker)

Nothing below can be trusted until this passes.

```bash
rm -rf node_modules package-lock.json
npm install
npm run test
```

Then re-run the full set: unit (`npm run test`), then the Playwright e2e suite.
Report which specs fail rather than fixing silently — the Turso/libSQL swap in
`47a46e8` and the dual-backend rate limiter are the two most likely breakages.

Specifically re-check, per `HANDOFF.md`:
- `src/lib/rate-limit.test.ts` — written against the old in-memory-only limiter;
  may need updating for the Upstash + in-memory fallback logic.
- `prisma.config.ts` — read it fresh; confirm nothing Turso-specific is missing
  beyond what `src/lib/db.ts` does.

## Task 2 — Resolve the uncommitted work

Review the six modified files. For each: finish it and commit, or revert it.
Do not leave the tree dirty — a portfolio project whose committed state differs
from the author's working copy is the thing a reviewing engineer notices first.
Commit in coherent units with real messages, not one "wip" blob.

## Task 3 — Walk the live deployment as a stranger (highest value)

This is the actual gate. On the deployed URL, not localhost:

1. Land on `/` cold, in a private window.
2. Click **Generate a quiz pack**. Confirm it does not error.
   - Most likely failure: `ANTHROPIC_API_KEY` was never set in the Vercel project
     settings. `HANDOFF.md` records that this key had to be entered by the user
     directly in the Vercel dashboard and was still outstanding. Verify it is set.
   - If a real key is not going to be set (cost), make the seeded demo pack the
     primary path instead — see Task 4.
3. Open a pack, edit a question inline, export all three PDF types
   (questions / answers / presenter script). Confirm each downloads and renders.
4. Create a live session. Join from a phone on a different network using the
   short code. Submit an answer, confirm auto-scoring, confirm the reveal and
   scoreboard update on the host screen.
5. Confirm the host key / admin auth actually gates the host view.

Write the result of each step into this file under a "Verified" heading with the date.

## Task 4 — Make the demo survive an empty room

A visitor arriving alone at 11pm currently sees a lobby with no teams, which is
the least impressive possible view of the best feature.

- Ensure a seeded demo pack always exists on the deployed instance
  (`POST /api/packs/seed` / `npm run db:seed` against the Turso DB), so
  "Manage your packs" is never empty.
- Consider a read-only "example session" showing a completed scoreboard.
- Regenerate `docs/screenshots/` with `npm run screenshots` after Task 1 and 2,
  so the images match current UI. These screenshots are going on the studio site
  as proof that works without a second person present.

## Task 5 — Repo presentation

Assume a prospective client's technical friend will open the repo.

- Confirm the repo's public/private state is what you intend. A "live demo" link
  with a 404 repo behind it is fine; a broken link is not.
- README: make sure the live link is above the fold and the screenshots render
  on GitHub.
- Remove or gitignore `claude/` and any scratch files if they are not meant to ship.
- Check `.env.example` does not carry anything real.

---

## Definition of done

- [x] `npm run test` and the Playwright suite both pass on a clean install (see "Closed 2026-09-07 evening"; one known e2e flake)
- [x] Working tree clean, everything pushed
- [x] All five steps of Task 3 walked on the live URL and recorded here
- [x] Demo is non-empty for a lone visitor ("Friday Night Demo Pack" is seeded on the live instance)
- [x] Screenshots regenerated and matching current UI

Only then does the live link go on yanshufstudio.com as the lead case study.

---

# Verified 2026-09-07 — Task 3 walked on the live deployment

Walked against `https://pub-quiz-trivia-night-automation-hu.vercel.app` by an agent
driving a real browser. All test data created during the walk has been deleted; the
deployed instance is back to holding only "Friday Night Demo Pack", with its Q1
`acceptableAnswers` restored to null.

## Corrections to "State as found" above

That section is stale. The six modified source files it lists were committed; `HEAD`
is still `103dcb9`, but the only modification in the working tree is
`package-lock.json`, with `HANDOFF.md`, `PORTFOLIO-READINESS.md` and `claude/`
untracked. **Task 2 is effectively done.** Task 1 (the test suite) remains untouched
and unverified.

## Results

| Step | Result |
|---|---|
| 1. Cold landing on `/` | **Pass.** Real homepage, headline and three CTA cards. Every request 200, no console errors. Renders correctly at 375px. |
| 2. Host auth gate | **Pass.** `POST /api/sessions/<code>/advance` with a wrong `hostToken` returns `401 {"error":"Invalid host key"}`. |
| 3. Generate a quiz pack | **FAIL, intermittently and reproducibly. See below.** |
| 4a. Inline question editing | **Pass.** Editing a field and blurring fires `PATCH /api/questions/<id>` → 200, and the value survives a reload. |
| 4b. PDF export, all three types | **Pass.** `questions`, `answers` and `script` each return 200, `application/pdf`, a real `%PDF-` header (3.2 KB / 3.5 KB / 5.3 KB) and a correct `Content-Disposition` filename. |
| 4c. Print preview page | **Pass.** `/packs/<id>/print` renders the full presenter script with per-question answers and points. |
| 5. Live session end to end | **Pass.** Created a session from the editor, two teams joined by short code, both submitted, host revealed. Auto-scoring is correct and case-insensitive: `"canberra"` scored 1 point against the answer "Canberra"; `"Sydney"` scored 0. Scoreboard reflected both on reveal. Advancing through to `ENDED` works. |

## The generation failure — the one blocker

`POST /api/packs/generate` returns `502 {"error":"Couldn't generate a quiz pack right
now. Please try again."}` for some prompts, every time, while other prompts succeed
every time.

Six attempts:

| Prompt | Attempts | Result |
|---|---|---|
| "...one round on world capitals, one round on 1980s film. Three questions per round." | 2 | 201 both times, 6.1 s and 7.0 s |
| "...one round on rivers, one round on 1990s pop music. Three questions per round." | 4 | 502 all four times, 4.8–5.3 s |

This is **not** a transient upstream error and **not** a missing key:

- `ANTHROPIC_API_KEY` is set. A missing key takes the `MissingApiKeyError` branch in
  `src/app/api/packs/generate/route.ts` and returns 503 with a different message. We
  get 502, which is the generic `catch`.
- It is not a Vercel function timeout — failures return *faster* (~5 s) than successes
  (~6–7 s), and no `maxDuration` is configured anywhere.
- It is deterministic per prompt, so it is content-dependent. Nothing about rate
  limiting, cold starts or Anthropic availability correlates with prompt text.

**Most likely cause**, unconfirmed: the Zod validation at the end of `generateQuizPack`
in `src/lib/generate-pack.ts`:

```
const parsed = generatedPackSchema.safeParse(toolUse.input);
if (!parsed.success) {
  throw new Error(`Generated quiz pack failed validation: ${parsed.error.message}`);
}
```

The prime suspect within that schema is the `MULTIPLE_CHOICE` refine in
`src/lib/quiz-schema.ts`, which requires `isValidOptionSet(options, answer)` — at least
two distinct options, one of which **exactly equals** `answer`. Note that
`isValidOptionSet` trims each option but does not trim `answer`, so `"Nirvana"` against
an answer of `"Nirvana "` fails. A music round is exactly where the model is most likely
to reach for multiple choice, which fits the observed prompt split.

Whatever the specific cause, the failure mode is bad in itself: **one malformed question
discards the entire generated pack**, and the user-facing message is "Please try again",
which is actively misleading for a deterministic failure — retrying cannot help.

### To confirm

Open the Vercel deployment's runtime logs and read the line written by
`console.error("Quiz pack generation failed:", err)` in
`src/app/api/packs/generate/route.ts` for one of the failing requests. That message
names the real cause exactly. Reproduce with the rivers/1990s-pop prompt above.

### Worth fixing regardless of cause

- Do not discard a whole pack for one bad question. Drop or repair the offending
  question and keep the rest.
- Trim `answer` in `isValidOptionSet`, symmetrically with the options.
- Fall back to `TEXT` when a `MULTIPLE_CHOICE` question's option set is invalid — the
  answer is still known, so the question is still usable.
- Do not tell the user "please try again" for an error that will recur identically.

## Second blocker — `ADMIN_TOKEN` is not set on Vercel

`DELETE /api/packs/<id>` with no `x-admin-token` header returned `200 {"ok":true}`.

`isAuthorizedAdmin` in `src/lib/admin-auth.ts` returns `true` when `ADMIN_TOKEN` is
unset — documented as the intended solo-local-dev default, with the comment noting it is
"the operator's job to set this before a shared/public deploy". That has not been done.
Anyone who knows the URL can delete the seeded demo pack, which is the only content on
the instance the studio site points at.

Fix: set `ADMIN_TOKEN` in the Vercel project's environment variables and redeploy.

Two smaller things seen alongside it: the route answers 200 for an id that does not
exist, so deletion is not distinguishable from a no-op; and rate limiting is applied to
`packs:generate` but not to the delete route.

## Note on existing state

The deployed instance still holds an earlier session `RBA4W` with a team named
"Test Team", from a manual test predating this walk. Harmless, but it is real data on a
public demo.

## Still open (as of the morning walk)

- Task 1 (test suite) — untouched. `npm run test` has not been run.
- Screenshots in `docs/screenshots/` — not regenerated.
- Task 5 (repo presentation) — not reviewed.

---

# Closed 2026-09-07 evening

Everything above is resolved. Summary of what was done and verified, in order.

## Test suite (Task 1)

- `npm run test`: 69/69. `npm run test:integration`: 65/65. `tsc --noEmit`, `eslint`,
  `next build` all clean.
- Playwright: `quiz-flow.spec.ts` passes. `tie-ending.spec.ts` timed out roughly one
  run in four: it clicked through all six questions in three browsers, and every step
  waited on a 3-second poll, so a clean run took ~23s against the 30s cap. Fixed after
  this walk by driving the answers and host transitions through the API and keeping
  the browsers only for join and the ENDED screens under test. Now ~5s, 10/10 green
  with `--repeat-each 5`.

## Generation 502 — root cause and fix

Confirmed as predicted: the `MULTIPLE_CHOICE` refine in `quiz-schema.ts`. Fixed in
`101a4c7`:

- `isValidOptionSet` trims `answer` symmetrically with the options.
- `generatedQuestionSchema` transforms a `MULTIPLE_CHOICE` question with an invalid
  option set into `TEXT` (options dropped) instead of rejecting it, so one bad question
  no longer discards the whole pack.

Verified on the live deployment: the rivers + 1990s pop prompt that returned 502 four
out of four times now returns `201` (6 questions: 4 TEXT, 2 MULTIPLE_CHOICE). The test
pack was deleted afterwards.

## Deployment pipeline (found while closing Task 1)

- The Vercel build of `b0c396a` had failed: Vercel restored the build cache, npm 11
  blocked `@prisma/client`'s postinstall script, and the generated client was stale
  (no `Creator`). Fixed in `638cb1e`: `build` runs `prisma generate` first.
- After that deployed, `/packs` and `/api/packs` returned 500 with
  `no such column: main.QuizPack.creatorId` — the `add_creator` migration had never been
  applied to Turso. Fixed in `cdefb6f`: `build` also runs `prisma migrate deploy`, so
  schema and code deploy together from Vercel's own env vars.

## `ADMIN_TOKEN`

Set to a real value in Vercel and redeployed. `DELETE /api/packs/<id>` without a header
now returns `401 {"error":"Invalid admin token"}`; with the wrong header, `401`; with
the right header, `200`.

## Repo presentation (Task 5)

- `HANDOFF.md` deleted (the deployment it described is finished).
- This file moved from the repo root to `docs/portfolio-readiness.md`.
- `claude/` planning documents committed alongside the design doc already tracked there.
- `.env.example` checked: placeholders only.
- Screenshots regenerated with `npm run screenshots`; the create-wizard capture now
  waits for the free-tier usage line so it shows the current UI.

## Live smoke, final

| Probe | Result |
|---|---|
| `GET /` | 200 |
| `GET /api/packs` | 200, "Friday Night Demo Pack" only |
| `GET /packs` | 200 |
| `GET /api/creator/status` | 200 `{"plan":"FREE","packsGeneratedInPeriod":0,"limit":2}` |
| `POST /api/packs/generate` (previously failing prompt) | 201 |
| `DELETE /api/packs/<id>` without token | 401 |
