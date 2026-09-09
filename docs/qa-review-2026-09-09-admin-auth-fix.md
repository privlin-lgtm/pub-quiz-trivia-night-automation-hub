# QA test-quality review — admin-auth fail-open fix (commit `c0f23d2`)

Scope: PR review of the two test files touched by `c0f23d2` ("Close
fail-open admin gate on pack DELETE") — `src/lib/admin-auth.test.ts` and
`src/test/pack-access.integration.test.ts`. Both authored, in the same
session, by the same agent that wrote the fix itself (`src/lib/admin-auth.ts`,
`src/app/api/packs/[id]/route.ts`) — the "Closed AI loop" case gets its own
section below rather than being folded into Design.

## Verification run

- `admin-auth.test.ts`: 3/3 green runs, 7 tests, ~1.1–1.2s each, 0–6ms/test.
  No flakiness, no timing concern.
- `pack-access.integration.test.ts`: 3/3 green runs, 25 tests, ~8.5s each
  (dominated by Prisma migration setup, not test bodies — 14–140ms/test).
  No flakiness.
- Mutation score: **attempted, not obtained.** `npx stryker run` against
  `src/lib/admin-auth.ts` with the vitest runner failed at plugin discovery
  ("Cannot find TestRunner plugin 'vitest'... no TestRunner plugins were
  loaded") even after installing `@stryker-mutator/core` and
  `@stryker-mutator/vitest-runner` locally (`--no-save`, cleaned up after —
  no package.json/lock change survives this review). Config and packages
  removed; nothing committed. Given the effort already spent chasing plugin
  discovery, I substituted a manual mutant trace (below) rather than keep
  debugging the tool.

## Findings by file

| File | Smells found | Severity | Mutation evidence |
|---|---|---|---|
| `src/lib/admin-auth.test.ts` | 1 low (misleading test title) | Low | Manual trace: all 4 plausible mutants in `isAuthorizedAdmin`/`isAdminTokenConfigured` killed |
| `src/test/pack-access.integration.test.ts` | 1 low (inconsistent unset-idiom), 1 medium (parameterization candidate) | Medium | Manual trace: the security-critical `&&`→`\|\|` mutant on the new `adminOverride` line — which exactly reintroduces the original vulnerability — is killed |

### Readability — N/A (no issues)

Both files: short, factory-driven setup (`newCreator`, `ownedPack`), no
mystery guests, descriptive names ("401s a stranger who guesses at the
x-admin-token header"). No action needed.

### Reliability — N/A (no issues)

No sleep-based waits, no real external services, no shared mutable state
between tests — each test builds its own `Creator`/`QuizPack` row. 3x-green
runs confirm no flakiness. `vi.stubEnv`/`vi.unstubAllEnvs` correctly scoped
per-`describe` with matching `beforeEach`/`afterEach`.

### Diagnostic — N/A (no issues)

Every new test has one behavior and one reason to fail. The paired
`expect(res.status)...` + `expect(await db.quizPack.findUnique(...))...`
in each DELETE test is not a "multiple failure causes" smell — it's testing
one guard from two angles (did it *say* no, did it *actually* say no), which
is the right level of assertion for an authorization test, not two unrelated
behaviors.

### Design

**[Low] Inconsistent "simulate unset" idiom across the two files** —
`admin-auth.test.ts:15,52` uses `delete process.env.ADMIN_TOKEN`;
`pack-access.integration.test.ts:267` uses `vi.stubEnv("ADMIN_TOKEN", "")`.
Both are correct here (`isAdminTokenConfigured` treats `""` and `undefined`
identically via `Boolean(...)`), but a reader skimming both files could
reasonably wonder whether the difference is deliberate. Not a bug — no fix
required, but worth a one-line comment at the `vi.stubEnv` call noting empty
string is intentionally treated as unset, if this file gets touched again.

**[Medium] `it.each` candidate** — the four tests in the new
`DELETE /api/packs/[id] with ADMIN_TOKEN unset` block
([pack-access.integration.test.ts:270-302](src/test/pack-access.integration.test.ts:270))
follow the same shape: build a pack (owned or ownerless), call `deletePack`
with a credential variant, assert status + persistence. A table of
`{cookie, header, expectedStatus, expectDeleted}` would compress this to one
parameterized block. Didn't push this — the varying pack setup (`ownedPack(null)`
vs `ownedPack(owner.id)`, and which cookie plays "owner" vs "stranger") makes
a clean `it.each` row shape less obvious than the catalogued example, so
this is a suggestion, not a request.

### AI-generated — Closed AI loop (the real finding here)

Both the fix and its tests came from the same agent, same session, no
independent human-authored boundary test. The skill's own escape hatch is an
objective mutation score; the tooling attempt failed (see Verification), so
I hand-traced the mutants that matter instead of asserting a number I don't
have:

- `isAuthorizedAdmin`'s early-return negation, the `!==`→`===` length check,
  and `isAdminTokenConfigured`'s two constant-return mutants are each killed
  by an existing, specific test (unset-allows-all, missing-header,
  different-length, exact-match, is-false-when-unset, is-true-when-set).
- The one mutant that matters most — `isAdminTokenConfigured() && isAuthorizedAdmin(req)`
  in [route.ts](src/app/api/packs/[id]/route.ts:33) mutated to `||` — is
  exactly the bug this commit fixes (unset token making every caller an
  admin again). It is killed: with `||`, the four new "ADMIN_TOKEN unset"
  tests would see a stranger's delete succeed (200) where they assert 401,
  and would fail.
- Not hand-traced: interactions between the length-check short-circuit and
  `timingSafeEqual` (the "wrong token" test never actually reaches the
  `timingSafeEqual` call, since `"wrong-token"` and the configured token
  differ in length — pre-existing, not introduced by this diff).

No fabricated imports, no hallucinated locators (nothing DOM-facing here),
no generic placeholder data beyond the pre-existing XKCD token string. No
convention drift — new tests match the file's existing `describe`/`it`
nesting and factory usage exactly.

**Recommendation:** fix the Stryker/vitest-runner plugin-discovery issue
in this repo (worth checking whether the non-ASCII path segment
`מסמכים` is the cause — Stryker's dynamic `import()`-based plugin loader
is a plausible place for that to break) so mutation score becomes a real,
running gate rather than a manual trace done once, in this review, by hand.

### Coverage

Happy path and 401/error paths both covered for the new logic. Boundary
covered: ownerless pack (no owner to fall back to) with token unset. Not
covered, low priority, pre-existing code not touched by this diff: deleting
an already-deleted id (route already `.catch(() => null)`s this), concurrent
deletes of the same pack.

## Automated gate

**None added.** The natural gate here is a mutation-score threshold on
`src/lib/admin-auth.ts` and the `adminOverride` line in
`src/app/api/packs/[id]/route.ts`, but Stryker couldn't be made to run in
this environment (see Verification) without more time than this review
justified. Recommend revisiting once the plugin-discovery issue is fixed —
until then, the manual mutant trace above is the best available evidence
that these tests constrain the implementation rather than describe it.
