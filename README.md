# Pub Quiz / Trivia Night Automation Hub

Generate a complete pub quiz pack with AI, print presenter scripts and PDF
question/answer sheets, and run the night live with teams submitting answers
from their phones.

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
   code. The host dashboard polls `GET /api/sessions/[code]?as=host` and
   drives the state machine via `POST /api/sessions/[code]/advance`
   (`start` → `reveal` → `next`).
4. **Play** — Teams join with `POST /api/sessions/[code]/join` (returns a
   token), then poll `GET /api/sessions/[code]?token=...` and submit answers
   via `POST /api/sessions/[code]/answers`. Answers are auto-scored by
   normalized exact match; the host can override via
   `PATCH /api/sessions/[code]/answers/[answerId]`.

Session states: `LOBBY → QUESTION_ACTIVE → REVEAL → (next question or ENDED)`.

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

## Project docs

See [PROMPTS.md](./PROMPTS.md) for the phase-by-phase build playbook,
including which tasks are better suited to Claude Code vs. Cursor.
