# E2E Speedup Phase 2 — Shared-World Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement
> this plan task-by-task. All `.js` edits route through the `titan-svelte-dev` subagent. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse ~100+ per-test Foundry world boots down to one boot per spec file, by migrating every
eligible e2e spec to a module-scoped shared `page` with inline `beforeAll(login)` lifecycle hooks, plus
per-test hygiene (close apps, reset error collector) and per-file world reset (clear chat).

**Architecture:** A new `tests/e2e/world.js` exports three stateless helpers (`closeAllApps`,
`clearChat`, `attachPageErrors`). Each migrated spec declares module-scoped `let page; let errors;`, boots
once in an inline `beforeAll`, cleans up in inline `afterEach`/`afterAll`, and every `beforeEach`/`test`
drops `{ page }` destructuring + the per-test `await login(page)` in favor of the closure `page`. Local
`page.on('pageerror')` listeners are replaced by the shared `errors` array. No test assertion changes.

**Tech Stack:** Playwright (`@playwright/test`), Foundry VTT v14 live world on `:30000`, Node ESM.

**Source spec:** `docs/superpowers/specs/2026-06-04-e2e-phase2-shared-world-harness-design.md`
(parent: `docs/superpowers/specs/2026-06-03-e2e-suite-speedup-design.md`, Workstream A Phase 2).
Closes `docs/TODO.md` #15 and `docs/OPEN_BUGS.md` #1 (socket-sync flake).

---

## Critical execution constraints

- **The world must be launched on `http://localhost:30000`** for any e2e to pass (world-launch-gated).
  Confirmed up at plan-authoring time. If `login` starts failing with 60s timeouts, STOP and report —
  the world has gone down; do not mass-edit blindly.
- **Verify each migrated file green individually:** `npx playwright test <file> --reporter=line` from the
  system root. A file is "done" only when it passes at the **same case count** as before migration.
- **Never `git add -A`.** The live world is mutating `packs/effects/*` (LevelDB log/MANIFEST churn shows
  in `git status`). Stage only the paths you touched: `git add tests/e2e/... docs/...`. Never stage
  `packs/`.
- **Do NOT migrate** (self-managed `BrowserContext`s via `multiClient.js`):
  `multi-client.spec.js`, `socket-sync.spec.js`, `permissions-compendium.spec.js`,
  `permissions-ownership.spec.js`, `permissions-auto-open.spec.js`. Leave them byte-for-byte unchanged.
- **Opt-out is allowed:** if a file genuinely cannot share a world (verified by a failing run after a
  good-faith migration), revert it to `beforeEach(login)` and record it in the task report. Do not block
  the run on one file.

---

## The canonical migrated shape (the recipe)

Every migrated spec ends in this exact shape. `beforeAll` uses the `{ browser }` fixture; nothing else
destructures Playwright fixtures.

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
   await login(page);            // the ONLY world boot for this file
   await clearChat(page);        // per-file world reset
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('…', () => {
   test.beforeEach(async () => {        // signature changed: no { page }; login line removed
      // ...remaining per-test fixture seeding, using the closure `page`...
   });

   test('…', async () => {              // signature changed: no { page }
      // ...use the closure `page`; assert error-freedom via expect(errors).toEqual([])...
   });
});
```

### Mechanical transform rules (apply per file)

1. Update imports: keep `login` from `./fixtures.js`; add `import { closeAllApps, clearChat, attachPageErrors } from './world.js';`
2. Add module-scoped `let page; let errors;` (with the JSDoc above) before the first `test.describe`/`test`.
3. Add the three inline lifecycle hooks (`beforeAll`/`afterEach`/`afterAll`) at module scope (outside any
   `describe`). They are file-scoped, so they fire even for top-level `test()` calls with no `describe`.
4. In **every** `beforeEach`, delete the `await login(page);` line and change `async ({ page }) =>` to
   `async () =>`. Keep the rest of the body (fixture seeding) verbatim.
5. Change **every** `test('…', async ({ page }) => …)` to `async () => …`. Same for any describe-level
   `afterEach(async ({ page }) => …)` → `async () =>`.
6. Replace any local `const errors = []; page.on('pageerror', e => errors.push(e.message))` with the shared
   `errors` array (remove the local declaration and the listener). Where a test asserted on its local
   array (e.g. `expect(errors).toEqual([])` / `.toHaveLength(0)`), point that assertion at the shared
   `errors`. Because `afterEach` clears it, each test still asserts only its own errors.
7. **Do not** change any assertion's meaning, locator, or expected value. This is a structural migration.

### Verify (every file, every task)

```
npx playwright test tests/e2e/<file>.spec.js --reporter=line
```
Expected: same number of passing cases as before, 0 failures.

---

## Task 0: Infrastructure — `world.js` + `renderSheet` refactor + canonical proof file

**Files:**
- Create: `tests/e2e/world.js`
- Modify: `tests/e2e/fixtures.js` (`renderSheet` gains an optional `errors` param, backward compatible)
- Migrate (proof): `tests/e2e/spells-filter.spec.js`

- [ ] **Step 1: Create `tests/e2e/world.js`** with exactly these three stateless helpers (typed, commented
  per project style). `closeAllApps` must close both ApplicationV2 instances and legacy AppV1 windows,
  each close try-caught; `clearChat` deletes all chat messages only; `attachPageErrors` wires one listener
  and returns its backing array.

```js
import { expect } from '@playwright/test';

/**
 * Close every open Foundry application so sheets, dialogs, HUDs, and tooltips do not leak into the next
 * test on the shared page. Closes both ApplicationV2 instances (`foundry.applications.instances`) and
 * legacy AppV1 windows (`ui.windows`); each close is individually try-caught so one failure does not
 * abort the rest of teardown.
 * @param {import('@playwright/test').Page} page - The shared page to clean.
 * @returns {Promise<void>} Resolves once every open application has been asked to close.
 */
export async function closeAllApps(page) {
   await page.evaluate(async () => {
      // Close ApplicationV2 instances (the modern app registry).
      const appV2 = [...(foundry.applications.instances?.values?.() ?? [])];
      for (const app of appV2) {
         try {
            await app.close();
         }
         catch (error) {
            // Ignore: a mid-teardown close failure must not abort the rest of cleanup.
         }
      }

      // Close legacy AppV1 windows (the deprecated registry still used by a few core dialogs).
      const appV1 = Object.values(globalThis.ui?.windows ?? {});
      for (const app of appV1) {
         try {
            await app.close();
         }
         catch (error) {
            // Ignore: see above.
         }
      }
   });
}

/**
 * Delete every chat message in the world. Keeps renders cheap, keeps assertions deterministic, and keeps
 * the world lean so GM-to-player socket replication does not exceed test timeouts. Targeted to chat only;
 * does NOT touch actors or items (specs use find-or-create fixtures).
 * @param {import('@playwright/test').Page} page - The shared page.
 * @returns {Promise<void>} Resolves once all chat messages are deleted.
 */
export async function clearChat(page) {
   await page.evaluate(async () => {
      const ids = globalThis.game.messages.map((message) => message.id);
      if (ids.length > 0) {
         await globalThis.ChatMessage.deleteDocuments(ids);
      }
   });
}

/**
 * Attach a single page-error collector to the shared page and return its backing array. Wire this ONCE in
 * the spec's `beforeAll`; clear it each `afterEach` (`errors.length = 0`) so each test still asserts
 * "no uncaught errors during MY actions". Replaces per-test `page.on('pageerror', …)` listeners, which
 * would otherwise stack on a reused page.
 * @param {import('@playwright/test').Page} page - The shared page.
 * @returns {string[]} The live array of collected uncaught-error messages.
 */
export function attachPageErrors(page) {
   /** @type {string[]} The collected uncaught page-error messages. */
   const errors = [];
   page.on('pageerror', (error) => {
      errors.push(error.message);
   });
   return errors;
}
```

- [ ] **Step 2: Refactor `renderSheet` in `tests/e2e/fixtures.js`** to accept an optional shared `errors`
  array. When provided, use it (do NOT attach a new listener); when omitted, preserve current behavior
  (attach its own listener) so unmigrated callers keep working. New signature + body:

```js
/**
 * Render a single document's sheet inside the live world and assert it appears with no uncaught page
 * errors.
 *
 * The document is located inside the page via a stringified locator function body (e.g.
 * `"() => game.actors.find((a) => a.type === 'player')"`) so the lookup runs in the Foundry runtime, not
 * the Node test process.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @param {string} locateSrc - Stringified locator: a function returning the document.
 * @param {string} expectedSelector - CSS selector the rendered sheet must expose.
 * @param {string[]} [errors] - Optional shared page-error collector (from `attachPageErrors`). When
 *   omitted, a local listener is attached for this single render (legacy/unmigrated behavior).
 * @returns {Promise<void>} Resolves once the sheet is visible and asserted error-free.
 */
export async function renderSheet(page, locateSrc, expectedSelector, errors) {
   // Use the shared collector when supplied; otherwise attach a local one for this render only.
   const localErrors = errors ?? [];
   if (!errors) {
      page.on('pageerror', (err) => {
         localErrors.push(err.message);
      });
   }

   // Locate the document and trigger its sheet render inside the Foundry runtime.
   const found = await page.evaluate(async (src) => {
      // Reconstruct the locator function from its stringified body.
      const doc = new Function(`return (${src})()`)();
      if (!doc) {
         return false;
      }
      await doc.sheet.render(true);
      return true;
   }, locateSrc);

   // The fixture must exist; assert the sheet is visible and no errors were thrown.
   expect(found, 'document fixture not found in world').toBe(true);
   await expect(page.locator(expectedSelector).first()).toBeVisible();
   expect(localErrors, `uncaught errors during render:\n${localErrors.join('\n')}`).toEqual([]);
}
```

- [ ] **Step 3: Migrate `tests/e2e/spells-filter.spec.js`** to the canonical shape (recipe above). It is a
  single-describe, single-test, clean file: one `beforeEach(login + seed)`, one `test`.
- [ ] **Step 4: Verify the proof file green.** Run `npx playwright test tests/e2e/spells-filter.spec.js --reporter=line`.
  Expected: 1 passed.
- [ ] **Step 5: Sanity-check a renderSheet caller still passes unmigrated** (proves the optional-param
  refactor is backward compatible): `npx playwright test tests/e2e/render-smoke.spec.js --reporter=line`.
  Expected: same pass count as before (render-smoke not yet migrated — still calls `renderSheet(page, …)`
  with no `errors` arg).
- [ ] **Step 6: Commit.** `git add tests/e2e/world.js tests/e2e/fixtures.js tests/e2e/spells-filter.spec.js && git commit`
  message: `test(e2e): add shared-world harness helpers + migrate spells-filter (Phase 2 infra)`.

---

## Task 1: reactive-* batch (7 files)

**Files (all CLEAN — recipe applies mechanically):**
- `tests/e2e/reactive-ability.spec.js`
- `tests/e2e/reactive-armor-shield.spec.js` (login is called **inside each test** via a seed helper, not a
  `beforeEach` — move it to `beforeAll`; tests then use the closure `page`)
- `tests/e2e/reactive-effect-rows.spec.js`
- `tests/e2e/reactive-expanded-toggle.spec.js`
- `tests/e2e/reactive-inventory-basic.spec.js`
- `tests/e2e/reactive-spell.spec.js`
- `tests/e2e/reactive-weapon.spec.js`

- [ ] Apply the recipe to each file. None has local `pageerror` listeners or renderSheet.
- [ ] For `reactive-armor-shield.spec.js`: it calls `login(page)` inside two tests (no `beforeEach`). Remove
  those inline `login` calls (the `beforeAll` now logs in once); keep the per-test seed helper calls.
- [ ] Verify each green: `npx playwright test tests/e2e/<file> --reporter=line`.
- [ ] Commit: `git add tests/e2e/reactive-*.spec.js && git commit -m "test(e2e): migrate reactive-* specs to shared world"`.

---

## Task 2: simple clean single-describe batch (6 files)

**Files (CLEAN):**
- `tests/e2e/effect-hud.spec.js`
- `tests/e2e/integration-manifest.spec.js`
- `tests/e2e/header-controls.spec.js`
- `tests/e2e/effect-reactivity.spec.js`
- `tests/e2e/rules-element-crud.spec.js` (two sequential `describe` blocks, each with a `beforeEach(login)`
  — drop login from BOTH, single shared `beforeAll`)
- `tests/e2e/logic/conditions.spec.js` (note: subfolder — `world.js`/`fixtures.js` import path is `../`,
  e.g. `import { login } from '../fixtures.js'`; mirror the existing `login` import path in that file)

- [ ] Apply the recipe. For `logic/conditions.spec.js`, the relative import prefix is `../` (it already
  imports `login` from `'../fixtures.js'`); import `world.js` from `'../world.js'`.
- [ ] Verify each green.
- [ ] Commit: `test(e2e): migrate simple single-describe specs to shared world`.

---

## Task 3: renderSheet users (3 files)

**Files:** `tests/e2e/render-smoke.spec.js`, `tests/e2e/header-buttons.spec.js`,
`tests/e2e/localization.spec.js`

- [ ] Apply the recipe.
- [ ] Each currently calls `renderSheet(page, …)` (3 args). Update those calls to pass the shared collector
  as the 4th arg: `renderSheet(page, locateSrc, selector, errors)`. This routes render-time errors through
  the shared array instead of a per-render local listener.
- [ ] `render-smoke.spec.js` uses `renderSheet` at 2 sites; `header-buttons.spec.js` and
  `localization.spec.js` at 1 each. `localization.spec.js` builds its describe with a loop over sheet
  types — keep the loop; only the lifecycle + signatures change.
- [ ] Verify each green.
- [ ] Commit: `test(e2e): migrate renderSheet-using specs to shared world + shared error collector`.

---

## Task 4: pageerror simple batch (8 files)

**Files (each has a local `page.on('pageerror')` and/or a top-level test with no describe):**
- `tests/e2e/filtered-list-checks.spec.js` — local pageerror inside the test → use shared `errors`.
- `tests/e2e/effect-checks.spec.js` — `login` + pageerror live INSIDE `beforeEach`; move login to
  `beforeAll`, fold pageerror into shared `errors`.
- `tests/e2e/effect-traits.spec.js` — pageerror in `beforeEach` → shared `errors`.
- `tests/e2e/trait-add-custom.spec.js` — pageerror in `beforeEach` → shared `errors`.
- `tests/e2e/traits.spec.js` — pageerror listeners in multiple tests → shared `errors`.
- `tests/e2e/effect-tray.spec.js` — already has a `test.afterEach` that closes app windows; keep it (it
  coexists with the file-level `afterEach(closeAllApps)`), and fold its one local pageerror into shared
  `errors`.
- `tests/e2e/editor-description.spec.js` — **top-level `test()` with no describe**, login inside the test,
  local pageerror. Add the file-scoped lifecycle hooks (they fire for top-level tests too); move login to
  `beforeAll`; the per-test `ensureDocument` setup stays in the test body using closure `page`; pageerror →
  shared `errors`.
- `tests/e2e/effect-sheet-layout.spec.js` — same shape as editor-description (top-level test, no describe,
  inline login, local pageerror).

- [ ] Apply the recipe + the per-file notes above.
- [ ] For each test that asserted on its local error array, repoint to the shared `errors` (cleared each
  `afterEach`, so semantics are preserved).
- [ ] Verify each green.
- [ ] Commit: `test(e2e): migrate pageerror-collecting specs to shared world`.

---

## Task 5: check/dialog pageerror batch (5 files)

**Files (local pageerror listeners + check/dialog/dice helpers — verify helpers still work on shared page):**
- `tests/e2e/checks-dialog.spec.js` — local pageerror in multiple tests; imports `checkDialog.js`,
  `dice.js`, `builders.js`.
- `tests/e2e/checks-integration.spec.js` — local pageerror; imports `checkDialog.js`, `dice.js`.
- `tests/e2e/checks-opposed.spec.js` — local pageerror in multiple tests; a `rollAttackWithTargets` helper
  manages `game.user.targets` with try/finally — **keep that helper as-is** (target management is per-test).
- `tests/e2e/interaction-rolls.spec.js` — pageerror in `beforeEach` AND per test.
- `tests/e2e/interaction-dialogs.spec.js` — pageerror in multiple tests; a `triggerInWorld` helper.

- [ ] Apply the recipe; fold every local pageerror into the shared `errors`.
- [ ] These files force/reset dice (`forceDice`/`resetDice` from `dice.js`). If a file has a
  describe-level `afterEach(resetDice)`, keep it (coexists with file-level `afterEach`). Verify dice reset
  still happens between tests on the shared page.
- [ ] Verify each green (these are the most behavior-sensitive — run twice if a flake appears).
- [ ] Commit: `test(e2e): migrate check/dialog specs to shared world`.

---

## Task 6: component-probe batch 1 — smaller files (4 files)

**Files (each: many `describe` blocks, EACH with `beforeEach(login)` + `afterEach(unmountAll, clearProbeEvents)`):**
- `tests/e2e/component-probe.spec.js` (6 describes)
- `tests/e2e/component-probe-labels.spec.js` (6 describes)
- `tests/e2e/component-probe-display.spec.js` (8 describes)
- `tests/e2e/component-probe-context.spec.js` (13 describes)

- [ ] Apply the recipe. The high-volume transform per file: in EVERY describe, delete `await login(page);`
  from its `beforeEach`, change that `beforeEach` to `async () =>`, change its
  `afterEach(async ({ page }) =>` to `async () =>`, and change every `test(…, async ({ page }) =>` to
  `async () =>`. Add the file-scoped `let page; let errors;` + 3 lifecycle hooks once at the top.
- [ ] The describe-level `afterEach(unmountAll + clearProbeEvents)` stays (it runs before the file-level
  `afterEach(closeAllApps)`); keep all probe imports from `./componentProbe.js`.
- [ ] Verify each green.
- [ ] Commit: `test(e2e): migrate component-probe small specs to shared world`.

---

## Task 7: component-probe batch 2 — medium files (2 files)

**Files:**
- `tests/e2e/component-probe-inputs.spec.js` (9 describes)
- `tests/e2e/component-probe-buttons.spec.js` (13 describes)

- [ ] Same transform as Task 6.
- [ ] Verify each green.
- [ ] Commit: `test(e2e): migrate component-probe medium specs to shared world`.

---

## Task 8: component-probe batch 3 — large files (2 files)

**Files:**
- `tests/e2e/component-probe-tags.spec.js` (20 describes — largest by describe count)
- `tests/e2e/component-probe-selects.spec.js` (16 describes, ~1200 lines — largest by size)

- [ ] Same transform as Task 6. These are the highest-volume edits; be meticulous that NO
  `async ({ page }) =>` remains and NO `await login(page);` line remains. A final grep inside each file
  for `({ page })` and `login(page)` should return nothing.
- [ ] Verify each green.
- [ ] Commit: `test(e2e): migrate component-probe large specs to shared world`.

---

## Task 9: special cases (4 files)

**Files (each has a structural quirk — handle per note, opt-out if a clean migration fails):**
- `tests/e2e/dice.spec.js` — has `test.afterEach(resetDice)` and login not in a standard top-level
  `beforeEach`. Move login to `beforeAll`; KEEP the `resetDice` afterEach (it coexists with file-level
  `afterEach(closeAllApps)`); ensure `forceDice`/`resetDice` still bracket each test correctly.
- `tests/e2e/logic/fast-check-smoke.spec.js` — single top-level `test()`, no describe, `login` inside the
  test. Subfolder → import paths use `../`. Add file-scoped hooks; move login to `beforeAll`. If the test
  also injects fast-check, ensure injection still applies (see rules-elements note).
- `tests/e2e/logic/rules-elements.spec.js` — subfolder (`../` imports). First describe's `beforeEach` calls
  `injectFastCheck(page)` BEFORE `login(page)`. `injectFastCheck` may rely on an init script that must run
  before navigation; on a shared world the only navigation is the single `beforeAll` `login`. **Verify**
  whether moving `injectFastCheck` into `beforeAll` *before* `login` keeps fast-check deterministic for the
  fast-check describe AND does not corrupt the non-fast-check describe. If it cannot be made to coexist,
  **opt this file out** (keep `beforeEach(login)` + per-describe `injectFastCheck`) and record why.
- `tests/e2e/combat-seed.spec.js` — calls `login(page, 'E2E GM 1')`. `DEFAULT_GM` is `'E2E GM 1'`, so
  `login(page)` in `beforeAll` is equivalent — use the no-arg form. Uses `combat.js`/`builders.js` helpers
  and seeds a combat encounter; keep its seed/teardown logic, adapting signatures to the closure `page`.

- [ ] Apply per-file. Verify each green. Opt-out any file that cannot share a world, and note it.
- [ ] Commit: `test(e2e): migrate special-case specs to shared world (with opt-outs noted)`.

---

## Task 10: full-suite verification + docs/skill update

**Files:** `docs/TODO.md`, `docs/OPEN_BUGS.md`,
`.claude/skills/titan-codebase/references/conventions.md`

- [ ] **Run the full e2e suite:** `npm run test:e2e` (≈34 min baseline). Capture wall-clock before/after if
  a Phase-1b baseline number is available; otherwise record the new wall-clock. Expected: full suite green
  at the **same case count** as the pre-Phase-2 baseline.
- [ ] **Confirm the socket-sync flake is gone:** `socket-sync.spec.js` A1/A2 should pass within the full
  run (the per-file `clearChat` keeps the world lean). If it recurs, apply the cheap mitigation noted in
  `OPEN_BUGS.md` #1 (raise the socket-sync test timeout / harden `multiClient.js` teardown) and note it.
- [ ] **Confirm boot-count reduction:** spot-check that a multi-describe file boots the world once (one
  `login` per file, not per test). The wall-clock drop is the primary signal.
- [ ] **Update `docs/TODO.md`:** mark #15 DONE (mirror the #14 entry style); note any opt-out files.
- [ ] **Update `docs/OPEN_BUGS.md`:** close #1 if the flake is resolved by the world-reset; else update it.
- [ ] **Update `titan-codebase` `conventions.md`:** add a short "Shared-world e2e harness" note documenting
  the `world.js` helpers, the `beforeAll(login)` + inline-hooks pattern, the shared `errors` collector, and
  the non-migrated multi-client specs.
- [ ] **Commit:** `git add docs/TODO.md docs/OPEN_BUGS.md .claude/skills/titan-codebase/references/conventions.md && git commit -m "docs(e2e): close Phase 2 (#15) + socket-sync flake (#1); document shared-world harness"`.
- [ ] **Finish the branch** via `superpowers:finishing-a-development-branch`.

---

## Self-review (against the spec)

- **Spec coverage:** `world.js` 3 helpers (Task 0) ✓; `renderSheet` errors param (Task 0) ✓; inline
  per-spec lifecycle (every task) ✓; migrate all ~42 eligible specs (Tasks 0–9) ✓; do-not-migrate the 5
  multi-client specs (constraints) ✓; per-file `clearChat` world reset (Task 0 helper, used in every
  `beforeAll`) ✓; shared `errors` collector replacing stacked listeners (Tasks 3–5) ✓; measurement +
  flake confirmation + docs/skill update (Task 10) ✓.
- **Type consistency:** helper names `closeAllApps` / `clearChat` / `attachPageErrors` used identically in
  `world.js` and every spec; `renderSheet(page, locateSrc, expectedSelector, errors?)` consistent across
  Task 0 (def) and Task 3 (callers).
- **No placeholders:** `world.js` and `renderSheet` bodies are complete; recipe is concrete; per-file notes
  are specific. File counts reconcile: 47 total specs − 5 excluded = 42 migrated across Tasks 0–9.
