# E2E Suite Speedup & Build-Output Hygiene — Design

- **Date:** 2026-06-03
- **Status:** Approved (design); ready for implementation plan(s)
- **Scope:** Two developer-experience workstreams: (A) make the Playwright e2e suite materially
  faster (full-suite wall-clock *and* single-spec iteration) and less flaky, without changing what
  the tests assert and without introducing parallel workers; and (B) build-output hygiene — emit the
  Vite build to `dist/` instead of littering the repo root, and clear the accumulated stale
  artifacts. The two are independent; B is lower-risk and runs first.

## Context

The e2e suite (`tests/e2e/`, ~40 spec files, ~355 cases) runs against a single live Foundry v14
world. Measured facts (not assumptions):

- **Fully serial.** `playwright.config.mjs`: `workers: 1`, `fullyParallel: false`, `timeout: 60_000`,
  `webServer.reuseExistingServer: true` (one Foundry server on `:30000`, one shared world).
- **Per-test world boot.** Most specs call `login(page)` in `beforeEach`; `login` (`fixtures.js`)
  does `goto('/join')` → select user → join → `waitForFunction(() => game.ready === true, 60_000)`.
  That is a full client world-boot **per test** — with ~100+ tests, the dominant cost.
- **Fixed settle sleeps.** `fixtures.js#renderSheet` sleeps `setTimeout(500)` after `sheet.render`;
  inline `setTimeout(500)` settles exist in `interaction-rolls`, `effect-checks`, `checks-opposed`,
  and others. `docs/TODO.md` #9 removed fixed sleeps **only** from the shared check helpers and
  explicitly left the rest "for a future pass."
- **No world reset.** State accumulates across tests and across runs (observed chat messages grow
  726 → 740+ within a session), so boots/renders get slower over time and risk cross-test
  contamination. World *documents* live server-side and persist regardless of login frequency;
  login frequency controls only the number of client boots and page/app cleanliness.
- **Why serial.** All tests mutate one shared world, so naive parallel workers would collide.

This design pursues **Strategy A**: cut the per-test boot cost, remove fixed sleeps, and add
hygiene — staying serial. (Parallelism is out of scope; see "Out of scope.")

## Goals

- Cut full-suite wall-clock by collapsing world boots from ~one-per-test to ~one-per-spec-file.
- Make single-file runs boot once, not once-per-test.
- Remove every fixed `setTimeout` settle in `tests/e2e`, replacing with condition polling (faster
  on fast machines, less flaky on slow/loaded ones).
- Keep the suite green: all currently-passing tests still pass (the suite is the regression gate
  for its own refactor).

## Non-goals

- **No parallel workers / multi-world.** Strategy B (N Foundry servers, each its own world) is not
  built here. Foundry runs one world per server, making it heavy/fragile; revisit only if A is
  insufficient.
- **No change to test assertions / coverage.** This is a harness/timing refactor, not a rewrite of
  what is verified.
- **No server-launch change.** `webServer.reuseExistingServer: true` and the launched-world
  workflow are unchanged; the suite remains world-launch-gated for the human-run gate.

## Decisions

1. **Strategy A**, phased: low-risk wins first (sleeps + hygiene), then the shared-world harness.
2. **Login granularity: per spec file, with opt-out.** Each file boots once; tests reuse the page.
   Any file/test needing a pristine boot uses the existing per-test `login()` path.
3. **Hygiene makes sharing safe:** per-test app-close + per-test error-listener reset; per-file
   chat-log clear.

## Architecture

### 1. Shared-world harness (`tests/e2e/world.js`, new)

A small helper that encapsulates the "boot once per file, reuse, clean between tests" pattern, so a
spec opts in with one call instead of hand-rolling `beforeAll`/`afterEach`/`afterAll`.

- **`beforeAll`:** create a page (`browser.newPage()`), `login()` it once, and expose it to the
  file's tests (e.g. via a returned accessor `getPage()` or a custom `test` fixture whose `page`
  resolves to the file-shared page).
- **Per-test teardown (`afterEach`):** see Hygiene below.
- **`afterAll`:** close the shared page.
- **Opt-out:** `login(page)` remains exported and unchanged. A file that needs fresh boots simply
  does not adopt the harness (keeps `beforeEach(login)`); a single test can spin up its own
  `browser.newPage()` + `login`. The self-managing multi-context specs (`multi-client.spec.js`,
  `socket-sync.spec.js`, which already create their own contexts/pages) are **not** migrated.

Exact Playwright mechanism (file-scoped `beforeAll`-shared page vs a custom `test.extend` fixture)
is an implementation detail for the plan; both are established patterns. The interface the specs
see is: "give me a logged-in page for this file, cleaned between tests."

### 2. Per-test hygiene (in the harness's `afterEach`)

Makes a reused page behave like a fresh one for the next test:

- **Close all open Foundry applications** so sheets/dialogs/HUDs/tooltips don't leak forward:
  close every entry in `foundry.applications.instances` (ApplicationV2) and legacy `ui.windows`
  (AppV1), guarded/try-caught so one failure doesn't abort teardown.
- **Reset page-error capture.** Today each test does `page.on('pageerror', …)`; on a reused page
  those listeners would stack and bleed errors across tests. Replace with a single shared collector
  attached once and **cleared in `afterEach`**, so each test still asserts "no errors during *my*
  actions."
- **Per-file chat-log clear (`beforeAll`):** delete existing chat messages at file start so they
  stop accumulating (keeps render cheap and assertions deterministic). Targeted to chat; does not
  wipe actors/items (specs use find-or-create fixtures).

### 3. Kill fixed sleeps (polling)

Grep-audit every `setTimeout` in `tests/e2e` and convert each settle to a condition wait:

- `fixtures.js#renderSheet` (line ~64): drop the `setTimeout(500)`; the existing
  `await expect(page.locator(expectedSelector).first()).toBeVisible()` already auto-retries — add a
  `waitForFunction` on the app instance only if a gap remains.
- Inline post-roll settles (`interaction-rolls`, `effect-checks`, `checks-opposed`, and any others
  found): replace `await new Promise(r => setTimeout(r, 500))` with polling for the observable
  effect (e.g. `expect.poll(() => messageCountAfterBaseline)` / `waitForFunction(game.messages.size
  > before)`), mirroring the `readNewestCheckFlags` pattern already in `checkDialog.js`.

## Phasing

Two plans under this one spec; the first de-risks the second.

- **Phase 1 — low risk (keeps per-test login):** add the hygiene helper (close-apps + listener
  reset) and the per-file chat clear, and convert all fixed sleeps to polling. Delivers immediate
  flake reduction and modest speed (recovered sleep time); proves the hygiene helper standalone.
- **Phase 2 — the boot-count win:** introduce the shared-world harness + opt-out and migrate specs
  onto it file-by-file (relying on Phase 1's hygiene for intra-file isolation). The opt-out lets any
  troublesome file remain per-test. This is where ~100+ boots collapse to ~40.

## Measurement & success criteria

- **Baseline:** the full-suite wall-clock from the run captured at design time (the run finishing in
  the background now) is the before-number; record it in the Phase plans.
- **Targets:** (a) full-suite wall-clock materially reduced; (b) a single spec file boots once, not
  once-per-test; (c) zero fixed `setTimeout` settles remain in `tests/e2e`; (d) the full suite is
  green at parity with the pre-refactor pass count.
- Capture before/after timings in each phase's verification.

## Risks & mitigations

- **Intra-file state/app leakage** (a reused page carries open apps or hooks into the next test) →
  `afterEach` closes all apps; chat cleared per file; opt-out for files that need isolation.
- **Stacked `pageerror` listeners** on the reused page → single shared collector cleared per test.
- **A wedged test poisoning its file's remaining tests** → blast radius bounded to one file
  (next file re-boots); opt-out available for known-fragile specs.
- **Specs that depend on fresh-boot semantics** (init/ready behavior, multi-client) → not migrated;
  keep per-test/own-context login.
- **Migration churn across ~40 specs (Phase 2)** → incremental, file-by-file; the harness adoption
  is one line per file; opt-out means partial migration is always green.

## Area inventory (refined in the plans)

- **New:** `tests/e2e/world.js` (shared-world harness + hygiene).
- **Modify:** `tests/e2e/fixtures.js` (drop `renderSheet` sleep; keep `login` as opt-out), the
  spec files carrying inline `setTimeout` settles (Phase 1), then spec files adopting the harness
  (Phase 2, incremental). `playwright.config.mjs` likely unchanged (still `workers: 1`).
- **Not touched:** `multi-client.spec.js`, `socket-sync.spec.js` (self-managed contexts); test
  assertions and fixtures' find-or-create logic.

## Workstream B — Build-output hygiene (root → dist/)

Independent of the speedup work and lower-risk; intended to run **first** (call it Phase 0).

**Problem.** `vite.config.mjs` sets `build.outDir: __dirname` (the repo root) with
`emptyOutDir: false`, so every build emits `index.js`, `index.js.map`, `style.css`, **and** hashed
code-split chunks (`<Name>-<hash>.js[.map]`) directly into the repo root. The root cannot be safely
auto-emptied, so stale chunks accumulate indefinitely — currently **154 loose build files** in root
(e.g. a dozen stale `InventoryItemTypeSelect-*.js`). All are already gitignored (`.gitignore`
lines 8–13), so this is local working-tree clutter, not tracked pollution — but it makes the tree
hard to read and grows unbounded.

**Fix — emit to `dist/` and empty it each build.**
- `vite.config.mjs`: `build.outDir` → `path.join(__dirname, 'dist')`; `emptyOutDir: true` (safe —
  `dist/` is dedicated and already gitignored — so stale chunks are wiped every build). The `lib`
  entry (`./index.js`, relative to `root: 'src/'`) and `cssFileName: 'style'` are unchanged.
- `system.json`: `esmodules: ["dist/index.js"]`, `styles: ["dist/style.css"]`. Foundry resolves
  these relative to the system root; chunks load relative to `dist/index.js`. **Manifest change →
  requires a Foundry restart** to take effect.
- Dev server (`npm run dev`, port 30001): the `server.proxy` rule proxying `style.css` from :30000
  (`vite.config.mjs:73`) follows to `dist/style.css`; verify the live-reload entry path still serves.
- Release packaging: `.github/workflows/main.yml:33` zips root `index.js index.js.map style.css`
  **and** `dist/` — drop the three root names (now inside `dist/`), keep `dist/`.
- Lint ignore: `eslint.config.js` (ignores `'index.js'`) → ignore `dist/` instead.
- `.gitignore`: the now-moot root build-output lines (8–13) can be removed (`dist/` at line 6 covers
  them).
- Live skill docs: update `references/architecture.md` (build-output-at-root facts, ~lines 135–148)
  and `references/conventions.md` (~353–356) to describe `dist/`. Do **not** edit historical
  spec/plan docs that merely record the old state.
- Delete the 154 stale root **build artifacts only** (`index.js`, `index.js.map`, `style.css`, and
  the hashed `*-<hash>.js[.map]` chunks); the `dist/` move + `emptyOutDir` prevents recurrence. Do
  NOT delete the intentional root dev scripts/config — `eslint.config.js`, `vite.config.mjs`,
  `fix-comments.js`, `count-long.cjs` (the last two are already in the eslint ignore list), nor
  `package.json`/`system.json`/`module.json`/`README`/`LICENSE`/`AUTHORS`.

**Success criteria:** a clean build leaves the repo root free of `*.js`/`*.js.map`/`style.css`
build artifacts (all under `dist/`); Foundry loads the system from `dist/` after a restart (sheets +
chat render, the full e2e suite stays green); the release zip still contains the runnable bundle.

**Risk:** a wrong path makes the system fail to load → mitigated by a post-change build + relaunch
smoke (render a sheet and a chat card, run a check spec) before merge. Loading a Foundry system from
a `dist/` subpath is a standard, supported pattern.

## Out of scope (possible future)

- **Strategy B — parallel workers with isolated worlds:** N Foundry server processes on N ports,
  each its own dataPath/world copy, Playwright projects sharding across them. Largest full-suite
  wall-clock win but high effort/risk given Foundry's one-world-per-server model. Revisit only if
  Strategy A's gains are insufficient.
