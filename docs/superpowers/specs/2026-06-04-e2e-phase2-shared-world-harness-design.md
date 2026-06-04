# E2E Speedup Phase 2 — Shared-World Harness + Hygiene (implementation design)

- **Date:** 2026-06-04
- **Status:** Approved (design); ready for implementation plan.
- **Parent spec:** `docs/superpowers/specs/2026-06-03-e2e-suite-speedup-design.md` (Workstream A,
  Phase 2). This doc resolves that spec's deliberately-deferred implementation decisions.
- **TODO:** `docs/TODO.md` #15. **Also closes:** the socket-sync flake `docs/OPEN_BUGS.md` #1.
- **Predecessor:** Phase 1b (`#14`, all fixed sleeps removed) is **DONE** (merged to `main` `5ef9d2e9`).

## Problem

`tests/e2e/` boots the live Foundry world **once per test**: nearly every spec calls `login(page)` in
`beforeEach`, and `login` (`fixtures.js`) does `goto('/join')` → select user → join →
`waitForFunction(game.ready === true, 60_000)`. With ~100+ tests this per-test world-boot is the
dominant wall-clock cost (full suite ~34 min). State also accumulates across tests/runs (chat grows
726 → 740+ within a session), which both slows renders and is the suspected cause of the socket-sync
flake (`OPEN_BUGS.md` #1: GM→player replication exceeds the 60 s timeout against a bloated world).

The suite is intentionally serial (`playwright.config.mjs`: `workers: 1`, `fullyParallel: false`,
`timeout: 60_000`, `webServer.reuseExistingServer: true`) because all tests mutate one shared world.
Parallelism stays out of scope.

## Resolved decisions (from the 2026-06-04 brainstorm)

1. **Sharing mechanism — module page + closure (`async () =>`), fully-inline per-spec hooks.** Each
   spec declares a module-scoped `let page`, boots it once in `beforeAll`, and tests/`beforeEach`
   become `async () => { … }` referencing the closure `page`. The lifecycle hooks are written
   **inline in each spec** (maximally explicit, no hidden state), calling shared helpers from
   `tests/e2e/world.js`. (The alternative — a `sharedWorld()` helper that registers the hooks and
   returns `getPage()` — was considered and rejected in favor of full inline transparency.)
2. **Rollout — all eligible specs this cycle.** Migrate every spec that currently does
   `beforeEach(login)`, in one push (file-by-file, each verified green). **Do NOT migrate** the
   self-managed multi-context specs `multi-client.spec.js` and `socket-sync.spec.js` (they create
   their own `BrowserContext`s/pages via `multiClient.js`). **Opt-out:** any spec that genuinely needs
   a pristine per-test boot keeps `beforeEach(login)` unchanged.
3. **Hygiene + world reset** make sharing safe (below).

## Architecture

### 1. `tests/e2e/world.js` (new) — shared helpers only

Because hooks are inline per spec, `world.js` exports **stateless helpers**, not a hook-registrar:

```js
/**
 * Close every open Foundry application so sheets/dialogs/HUDs/tooltips do not leak into the next test.
 * Closes both ApplicationV2 instances and legacy AppV1 windows; each close is try-caught so one
 * failure does not abort teardown.
 * @param {import('@playwright/test').Page} page - The shared page to clean.
 * @returns {Promise<void>}
 */
export async function closeAllApps(page) { /* page.evaluate over foundry.applications.instances + ui.windows */ }

/**
 * Delete all chat messages in the world (keeps render cheap and assertions deterministic, and keeps
 * the world lean so socket replication does not time out). Targeted to chat only — does NOT touch
 * actors/items (specs use find-or-create fixtures).
 * @param {import('@playwright/test').Page} page - The shared page.
 * @returns {Promise<void>}
 */
export async function clearChat(page) { /* page.evaluate: ChatMessage.deleteDocuments(game.messages...) */ }

/**
 * Attach a single page-error collector to the shared page and return its backing array. Wire ONCE in
 * the spec's beforeAll; clear it each afterEach (`errors.length = 0`) so each test still asserts
 * "no uncaught errors during MY actions". Replaces per-test `page.on('pageerror', …)` (which would
 * stack listeners on a reused page).
 * @param {import('@playwright/test').Page} page - The shared page.
 * @returns {string[]} The live array of collected error messages.
 */
export function attachPageErrors(page) { /* const errors=[]; page.on('pageerror', e=>errors.push(e.message)); return errors; */ }
```

### 2. The per-spec inline lifecycle (the migration target)

Every migrated spec adopts this exact shape:

```js
import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);                 // the ONLY world boot for this file
   await clearChat(page);             // per-file world reset
});
test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});
test.afterAll(async () => {
   await page?.close();
});

test.describe('…', () => {
   test.beforeEach(async () => {      // signature changed: no { page }
      await page.evaluate(seedFixtures);   // per-test fixture seeding stays per-test
   });
   test('…', async () => {            // signature changed: no { page }
      // use the closure `page`; assert error-freedom via `expect(errors).toEqual([])`
   });
});
```

### 3. Page-error refactor

`renderSheet` (`fixtures.js`) currently attaches its own `page.on('pageerror')` and asserts
`errors === []`; specs `render-smoke.spec.js`, `localization.spec.js`, and `effect-tray.spec.js`
(test 1) do likewise. On a shared page these per-test listeners stack and bleed errors across tests.
**Refactor:** these read the shared `errors` array from `attachPageErrors` instead. `renderSheet`
gains an `errors` parameter (or returns the offending list) so the caller supplies the shared
collector rather than attaching a fresh listener.

## Migration recipe (per spec)

1. Replace `import { login } from './fixtures.js'` block with the `world.js` imports + the inline
   `let page; let errors;` and the three lifecycle hooks (above).
2. Remove `await login(page)` from `beforeEach`; keep the rest of `beforeEach` (fixture seeding) but
   change its signature to `async () => {}` and reference the closure `page`.
3. Change every `test('…', async ({ page }) => {…})` to `async () => {…}`.
4. Replace any spec-local `page.on('pageerror', …)` + local error array with the shared `errors`.
5. Run the file: `npx playwright test <file> --reporter=line` → green at the same pass count.
6. Commit per a small batch of files.

**Not migrated:** `multi-client.spec.js`, `socket-sync.spec.js` (self-managed contexts). The
`global-setup.js`, `fixtures.js` `login`/`ensureDocument`, `poll.js`, and `multiClient.js` interfaces
are otherwise unchanged.

## Measurement & success criteria

- **Boot count:** a single spec file boots the world ONCE (one `login`), not once-per-test.
- **Full-suite wall-clock** materially reduced from the Phase-1b baseline (capture before/after;
  world-launch-gated `npm run test:e2e`, ~34 min — the human must have the world launched on `:30000`).
- **Green at parity:** the full suite passes at the same case count as before Phase 2.
- **Socket-sync flake:** A1/A2 no longer time out late in a full run (the per-file `clearChat` keeps the
  world lean). Re-run the full suite to confirm; if it recurs, the cheap mitigation (raise the
  socket-sync test timeout / harden `multiClient.js` teardown) stays available.

## Risks & mitigations

- **Intra-file leakage** (open apps / hooks carried into the next test) → `afterEach` closes all apps;
  chat cleared per file; opt-out for any file that needs isolation.
- **Stacked `pageerror` listeners** → single shared collector cleared per test.
- **A wedged test poisoning its file** → blast radius bounded to one file (next file re-boots); opt-out
  for known-fragile specs.
- **Specs depending on fresh-boot semantics** (init/ready behavior, multi-client) → not migrated.
- **Migration churn across ~40 specs** → file-by-file, each verified green; signatures change but the
  edit is mechanical (subagent-driven, routed through `titan-svelte-dev`).

## Out of scope

Parallel workers / multi-world (parent spec "Strategy B"); any change to test assertions or to the
launched-world workflow (`reuseExistingServer: true` stays).
