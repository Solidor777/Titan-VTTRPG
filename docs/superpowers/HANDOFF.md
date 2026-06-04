# Session Handoff — 2026-06-04 (prepare-for-clear)

Resume point after a context `/clear`. Read this, then the referenced docs.

## Resume sequence (what to do next)

**Implement e2e speedup Phase 2 (`docs/TODO.md` #15) — the shared-world harness + hygiene.** Brainstorm
is DONE and the implementation design is **written + approved**:
`docs/superpowers/specs/2026-06-04-e2e-phase2-shared-world-harness-design.md` (resolves the parent
spec's open decisions). **Resume by:** (optionally let the user glance at that spec, then) invoke
`superpowers:writing-plans` to create the implementation plan, then `superpowers:subagent-driven-development`
to execute it. Route all `.js` edits through the `titan-svelte-dev` subagent; load
`foundry-vtt` + `titan-codebase`. The suite is the regression gate for its own refactor — keep it green
at parity, verifying each migrated file with `npx playwright test <file> --reporter=line`.

### Approved Phase 2 decisions (locked — do not re-litigate)

- **Mechanism:** module-scoped `let page` + closure; tests/`beforeEach` become `async () =>` using the
  closure `page`. **Hooks are written FULLY INLINE in each spec** (`beforeAll` boots once via `login`;
  `afterEach` calls `closeAllApps(page)` + clears the error array; `afterAll` closes the page). New
  `tests/e2e/world.js` exports only **stateless helpers** — `closeAllApps(page)`, `clearChat(page)`,
  `attachPageErrors(page) → errors[]` — NOT a hook-registrar.
- **Rollout:** migrate **all ~40 eligible specs this cycle** (every `beforeEach(login)` spec),
  file-by-file. **Do NOT migrate** `multi-client.spec.js` / `socket-sync.spec.js` (self-managed
  contexts). Per-spec opt-out = keep `beforeEach(login)`.
- **Hygiene:** `afterEach` closes all apps (`foundry.applications.instances` + `ui.windows`, try-caught)
  and resets the shared page-error collector (`errors.length = 0`). **World reset:** per-file
  `clearChat(page)` in `beforeAll` (the chat bloat is what times out socket replication → fixes
  `OPEN_BUGS.md` #1). Actor/item fixtures left to specs' find-or-create logic.
- **Page-error refactor:** the per-test `page.on('pageerror')` in `renderSheet` (`fixtures.js`) and in
  `render-smoke` / `localization` / `effect-tray` (test 1) is replaced by reading the shared `errors`
  array (listeners would otherwise stack on the reused page). `renderSheet` gains an `errors` param.

### Measurement

Capture a before/after full-suite wall-clock (`npm run test:e2e`, ~34 min, **world-launch-gated** — the
human must have the world launched on `:30000`). Per-file boot-once is the primary success signal; also
confirm the socket-sync A1/A2 flake is gone.

## Just shipped (this session, merged + pushed to `main` at `5ef9d2e9`)

- **E2E speedup Phase 1b (`docs/TODO.md` #14) — DONE.** Removed **all 92 fixed sleeps** (33 `setTimeout`
  + 59 `page.waitForTimeout`) across **19 e2e spec files**, replaced with deterministic conditions
  (`titanWait` in-page / `expect.poll` / auto-retrying web-first assertions). No assertion changed
  (final adversarial review APPROVED). One sanctioned bounded wait remains in
  `permissions-auto-open.spec.js` (negative assertion; the auto-open hook is un-awaited). Patterns
  documented in `titan-codebase` `conventions.md` ("No fixed sleeps in E2E"). Plan:
  `docs/superpowers/plans/2026-06-04-e2e-speedup-phase1b-bespoke-sleeps.md`. Unit **92** green; each
  touched e2e file verified green file-by-file (full-suite at-parity run not yet done).
  **Grep proof:** `git grep -nE "setTimeout|waitForTimeout" -- tests/e2e` → only `poll.js:25` + the one
  documented exception.

## The "no fixed sleeps" conversion patterns (reuse in Phase 2 if any settle is needed)

- **Delete** a sleep that precedes an auto-retrying `expect(locator).toX` / auto-waiting `.click()`/`.fill()`.
- **`expect.poll`** before a non-retrying read (`page.evaluate`, `locator.count()/.textContent()/
  .inputValue()/.getAttribute()/.allTextContents()`) — guard the poll body so it returns a sentinel, not throws.
- In-page **`titanWait(syncPredicate, {message})`** (`tests/e2e/poll.js`, installed by `login()` before nav).

## Rules (CLAUDE.md Strict Rules, non-negotiable)

1. No test/e2e code in shipping builds. 2. Test/e2e code → `test/build/`, self-cleaning. 3. No dynamic
imports in shipping builds, ever. 4. No stub fixes (fix root cause). 5. No unlogged todos (→ `docs/TODO.md`);
bugs → `docs/OPEN_BUGS.md`. 7. Project `.claude/CLAUDE.md` supersedes all others.

## Pointers
- Rules: `.claude/CLAUDE.md`. Todos: `docs/TODO.md` (**#15 NEXT**; #14 closed). Bugs: `docs/OPEN_BUGS.md`
  (#1 socket-sync flake — fixed by #15's world-reset).
- E2E speedup design (covers #14 done + #15 next): `docs/superpowers/specs/2026-06-03-e2e-suite-speedup-design.md`.
- E2E harness facts: `tests/e2e/fixtures.js` (`login`/`renderSheet`/`ensureDocument`),
  `tests/e2e/poll.js` (`installPoll`/`titanWait`), `tests/e2e/multiClient.js` (self-managed — do not migrate),
  `playwright.config.mjs` (`workers: 1`, `fullyParallel: false`). Conventions: `titan-codebase` `conventions.md`.
- Gotcha: test **source** is `tests/` (plural); built test **artifacts** are `test/build/` (singular, gitignored).
