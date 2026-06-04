# Session Handoff — 2026-06-04 (prepare-for-clear)

Resume point after a context `/clear`. Read this, then the referenced docs.

## Resume sequence (what to do next)

**Implement e2e speedup Phase 2 (`docs/TODO.md` #15) — the shared-world harness + hygiene.** This is
the substantial speedup: the suite currently boots the Foundry world **once per test** (~100+ boots);
Phase 2 collapses that to **once per spec file** (~40 boots) with per-test hygiene so a reused page
behaves like a fresh one. **The per-file/per-run world reset also fixes the socket-sync flake**
(`docs/OPEN_BUGS.md` #1). Approved design spec (Workstream A, Phase 2):
`docs/superpowers/specs/2026-06-03-e2e-suite-speedup-design.md`.

This is its own **brainstorm → plan → implement (subagent-driven)** cycle. Route all `.js` edits
through the `titan-svelte-dev` subagent; load `foundry-vtt` + `titan-codebase` (the suite is the
regression gate for its own refactor — keep it green at parity).

### Open implementation decisions to settle in the brainstorm

The spec deliberately left these to the plan:
1. **Shared-page mechanism** — file-scoped `beforeAll` that logs in one `browser.newPage()` and exposes
   it via an accessor, **vs** a custom `test.extend` fixture whose `page` resolves to the file-shared
   page. Both are established Playwright patterns; pick one and standardize it in `tests/e2e/world.js`.
2. **Per-test hygiene** (`afterEach`) — close all open apps (`foundry.applications.instances` +
   legacy `ui.windows`, try-caught); replace per-test `page.on('pageerror', …)` with a single shared
   collector **cleared each test**; (per file) clear chat messages so they stop accumulating.
3. **Migration strategy / opt-out** — migrate specs file-by-file (one line per file); `login()` stays
   exported and unchanged as the opt-out. **Do NOT migrate** the self-managed multi-context specs
   (`multi-client.spec.js`, `socket-sync.spec.js`) — they create their own contexts/pages.
4. **World reset** — what to trim (chat clear + accumulated state) and when (per-file `beforeAll` and/or
   per-run), without wiping the find-or-create fixtures specs rely on.

### Measurement

Capture a before/after full-suite wall-clock (`npm run test:e2e`, ~34 min, **world-launch-gated** — the
human must have the world launched on `:30000`). Per-file boot-once is the primary success signal.

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
