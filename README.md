# Pub Quiz / Trivia Night Automation Hub

Generate a complete pub quiz pack with AI, print presenter scripts and PDF
question/answer sheets, and run the night live with teams submitting answers
from their phones.

## Screenshots

Real, in-browser captures from `npm run screenshots` (Playwright drives an
actual live session end-to-end — nothing here is mocked or hand-edited).

| | |
|---|---|
| ![Landing page](docs/screenshots/01-landing.png) Landing page | ![Generate wizard](docs/screenshots/02-create-wizard.png) AI generation wizard |
| ![Pack editor](docs/screenshots/03-pack-editor.png) Pack editor | ![Print preview](docs/screenshots/04-print-preview.png) Presenter script / print preview |
| ![Host lobby](docs/screenshots/05-host-lobby.png) Host desk — lobby | ![Team join](docs/screenshots/06-team-join.png) Team portal — join screen |
| ![Host: question live](docs/screenshots/07-host-question-live.png) Host desk — question live | ![Team: answering](docs/screenshots/08-team-answer.png) Team portal — answering |
| ![Host: live submission](docs/screenshots/09-host-live-submission.png) Host desk — live submission, auto-scored | ![Host: reveal + scoreboard](docs/screenshots/10-host-reveal-scoreboard.png) Host desk — revealed, scoreboard updated |
| ![Team: reveal](docs/screenshots/11-team-reveal.png) Team portal — reveal, correct + score | |

Regenerate these anytime with `npm run screenshots` (spins up its own
throwaway DB and dev server, so it never touches `prisma/dev.db`).

## Stack

- Next.js (TypeScript, App Router, Tailwind)
- Prisma + SQLite
- Anthropic (Claude) API for quiz generation (structured tool-use output)
- `@react-pdf/renderer` for PDF export
- Vitest for unit tests
- Live team portal via polling (no websockets)

## Setup

```bash
npm install
cp .env.example .env   # then fill in ANTHROPIC_API_KEY
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No API key yet? `POST /api/packs/seed` creates a small static demo pack so you
can exercise the editor, PDF export, and live session flow without calling
Claude. There's also a CLI seed script: `npm run db:seed`.

## Core flow

1. **Generate** — `/create` sends a free-text brief to
   `POST /api/packs/generate`, which calls Claude (via a forced tool call, so
   the response is schema-validated JSON) and persists the pack via Prisma.
2. **Edit** — `/packs/[id]` lists rounds/questions for inline editing
   (`PATCH /api/questions/[id]`) and links to PDF exports
   (`GET /api/packs/[id]/pdf?type=questions|answers|script`).
3. **Host** — `POST /api/sessions` creates a live session with a short join
   code **and a separate, unguessable host key** (returned once, stored in
   the host's browser). The host dashboard polls
   `GET /api/sessions/[code]?as=host&hostToken=...` and drives the state
   machine via `POST /api/sessions/[code]/advance` (`start` → `reveal` →
   `next`), both requiring that key.
4. **Play** — Teams join with `POST /api/sessions/[code]/join` (returns a
   token), then poll `GET /api/sessions/[code]?token=...` and submit answers
   via `POST /api/sessions/[code]/answers`. Answers are auto-scored by
   normalized exact match; the host can override via
   `PATCH /api/sessions/[code]/answers/[answerId]` (also host-key gated).

Session states: `LOBBY → QUESTION_ACTIVE → REVEAL → (next question or ENDED)`.
Every state transition is an atomic conditional update (`updateMany` guarded
by the exact state it read), so two concurrent advance calls — a double-tap,
a retried request on flaky venue wifi — can't both apply; the loser gets a
409 instead of silently skipping a question.

## Security notes

- **Join code vs. host key**: the join code is handed to every team by
  design, so it can't double as proof of host authority. Session creation
  also returns a separate host key, required on every session-control
  endpoint (`advance`, the answer-score override, and the host view) and
  compared with a constant-time check (`src/lib/host-auth.ts`). The host
  dashboard stores it in `localStorage`; if that's lost (different device,
  cleared storage), `/host/[code]` offers a "paste your host key" recovery
  form rather than a hard lockout.
- **Rate limiting**: `POST /api/packs/generate` (spends real Anthropic API
  credit) and `POST /api/packs/seed` are throttled per-IP
  (`src/lib/rate-limit.ts`) — an in-memory, single-instance limiter, which
  matches this app's single-process deployment model.
- **`ADMIN_TOKEN`** (optional, see `.env.example`): if set, `DELETE
  /api/packs/[id]` requires it via an `x-admin-token` header. Nothing in the
  UI calls this route today; it exists to be reachable safely once something
  does. Unset by default for solo local dev.
- These are proportionate to this app's actual trust model — one host
  running one venue's quiz for a room of teams — not a multi-tenant SaaS
  auth system. See [PROMPTS.md](./PROMPTS.md) history / commit messages for
  the fuller threat-model reasoning.

## Testing

```bash
npm run test              # unit tests (scoring, scoreboard, session state machine)
npm run test:integration  # full session-lifecycle tests against a real (throwaway) SQLite DB
npm run test:e2e          # Playwright: real browser, host + team tabs, full UI flow
npx tsc --noEmit          # typecheck
npm run lint
```

`test:integration` spins up `prisma/test.db` (migrated fresh each run, gitignored)
and drives the actual route handlers — create pack → create session → join →
answer → auto-score → reveal → host override → advance through every question
to `ENDED` — plus edge cases like duplicate team names and answering before
the quiz has started.

`test:e2e` runs against `prisma/e2e.db` (own throwaway DB, migrated fresh
by a Playwright global setup) and a dedicated `next dev` on port 4517 that
Playwright starts itself. It drives two real browser contexts (host + team)
through the actual UI: seed a pack via API, open the pack editor, click
"Start live session", join as a team on `/play`, submit an answer, reveal,
and assert the scoreboard updates on both sides.

### Load test

```bash
npm run dev                                   # in one terminal
npm run load-test -- --teams=20 --base=http://localhost:3000   # in another
```

Simulates N teams joining a fresh session and polling every ~3s (like real
phones) while a host driver advances the quiz to completion, printing
latency stats for polls, answer submissions, and host advance calls. A
20-team run against `next dev` (unoptimized, single SQLite writer) completed
in ~70s with p95 poll latency around 2s; expect noticeably better numbers
from a production build. Occasional `409 This question is no longer
accepting answers` errors are expected — a team's submit racing the host's
reveal — and the UI already surfaces them as a normal inline error rather
than crashing.

## CI

`.github/workflows/ci.yml` runs typecheck, lint, unit tests, integration
tests, and the Playwright E2E test on every push/PR — no secrets required
(nothing in the suite calls the real Claude API).

## Known limitations

- SQLite is single-writer; fine at this app's target scale (tens of teams,
  one session at a time) but would need to move to Postgres for a
  multi-tenant deployment (low-effort swap via Prisma).
- The in-memory rate limiter and the `hostToken`/`ADMIN_TOKEN` model assume
  a single-process deployment and one operator, not a distributed multi-tenant
  service.
- `npm audit` reports 3 high-severity findings, all from the same
  dev-time-only chain (`prisma` CLI → `@prisma/config` → `deepmerge-ts`, a
  stack-exhaustion issue). Not reachable by the running app; no fix is
  available yet without moving to an unstable `prisma@8` release candidate.

## Project docs

See [PROMPTS.md](./PROMPTS.md) for the phase-by-phase build playbook,
including which tasks are better suited to Claude Code vs. Cursor.
