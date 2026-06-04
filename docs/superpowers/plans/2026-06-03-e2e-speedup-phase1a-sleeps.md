# E2E Speedup Phase 1a — Sleep Removal (uniform bulk) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ~38 uniform fixed `setTimeout` settles in the e2e suite (render-settle + roll-settle) with condition polling, so the suite is faster on quick machines and less flaky on slow ones — keeping per-test login (Phase 2 changes that separately).

**Architecture:** Add one in-page poll helper (`titanWait`) injected on every page by `login()`. Convert the two uniform sleep families: (a) **roll-settle** — `setTimeout` → `titanWait(() => game.messages.size > before)`; (b) **render-settle** — drop the sleep after `await sheet.render(true)` and rely on the awaited render + the test's own condition (Playwright `toBeVisible` auto-retry when the assertion is Node-side, or `titanWait` on the asserted DOM/value when the assertion is in-page). Each spec is run after conversion to confirm green.

**Tech Stack:** Playwright (`expect.poll`, `addInitScript`, `toBeVisible` auto-retry), Foundry v14 in-page runtime, the live Foundry on `:30000`.

---

## Scope

**IN (this plan, ~38 sites):**
- **Roll-settle (5):** `checks-opposed.spec.js` (lines 74, 220, 261), `effect-checks.spec.js` (110), `interaction-rolls.spec.js` (160).
- **Render-settle via the shared `renderSheet` helper (1):** `fixtures.js` (64).
- **Render-settle inline (~32):** `editor-description` (31), `effect-reactivity` (34), `effect-sheet-layout` (34), `effect-traits` (47), `header-buttons` (20, 98), `header-controls` (28), `interaction-dialogs` (41), `reactive-ability` (44), `reactive-effect-rows` (46), `reactive-inventory-basic` (52, 133), `reactive-expanded-toggle` (34), `reactive-armor-shield` (50), `reactive-spell` (48), `reactive-weapon` (47), `rules-element-crud` (32, 85), `spells-filter` (27), `trait-add-custom` (55), `traits` (60).

**OUT (deferred to Phase 1b — bespoke, separate plan):** `effect-tray.spec.js` (18), `localization.spec.js` (2 tray sites), `logic/rules-elements.spec.js` (10), `logic/conditions.spec.js` (2), `permissions-auto-open.spec.js` (1 assert-absence). These need per-site tray/derived conditions or special handling.

## Ground rules
- **World-launch-gated:** verification runs against the live Foundry on `:30000` — coordinate launch with the user. A single spec: `npx playwright test tests/e2e/<file>`.
- **Per-test login is unchanged** in this plan.
- **Implement on a branch** (e.g. `chore/e2e-sleep-removal`), off `main`.
- The conversion rule for an in-page settle is always: **wait for the exact condition the test checks immediately after the sleep** (a message count, a DOM element, a derived value). Never invent a different condition.

---

## Task 1: In-page poll helper (`titanWait`)

**Files:**
- Create: `tests/e2e/poll.js`
- Modify: `tests/e2e/fixtures.js` (import + call in `login`)

- [ ] **Step 1: Create the helper module**

`tests/e2e/poll.js`:

```javascript
/**
 * Install an in-page polling helper on the given Playwright page. After this runs, every
 * `page.evaluate` in the page can `await globalThis.titanWait(predicate, options)` to wait for a
 * condition instead of sleeping a fixed duration. Must be called BEFORE navigation (uses
 * `addInitScript`, which runs on every document load).
 * @param {import('@playwright/test').Page} page - The Playwright page to instrument.
 * @returns {Promise<void>} Resolves once the init script is registered.
 */
export async function installPoll(page) {
   await page.addInitScript(() => {
      /**
       * Polls `predicate` until it returns truthy or the timeout elapses.
       * @param {() => boolean} predicate - Condition to await; evaluated in the page realm.
       * @param {{ timeout?: number, interval?: number, message?: string }} [options] - Wait options.
       * @returns {Promise<void>} Resolves when the predicate is truthy; rejects on timeout.
       */
      globalThis.titanWait = async (predicate, options = {}) => {
         const { timeout = 5000, interval = 50, message = 'condition' } = options;
         const start = Date.now();
         while (!predicate()) {
            if (Date.now() - start > timeout) {
               throw new Error(`titanWait timed out after ${timeout}ms waiting for: ${message}`);
            }
            await new Promise((resolve) => {
               setTimeout(resolve, interval);
            });
         }
      };
   });
}
```

- [ ] **Step 2: Wire it into `login`**

In `tests/e2e/fixtures.js`, add the import near the top:
```javascript
import { installPoll } from './poll.js';
```
Then make `installPoll` run before navigation — insert it as the FIRST statement inside `login`, before `await page.goto('/join')`:
```javascript
   // Install the in-page poll helper before navigating (addInitScript runs on document load).
   await installPoll(page);
```

- [ ] **Step 3: Verify the helper is available in-page**

Build/launch not required for this check beyond a running world. With the world up, run any quick spec that logs in, e.g.:

Run: `npx playwright test tests/e2e/render-smoke.spec.js`
Expected: PASS (login still works; `installPoll` added no failure). Additionally, the conversions in later tasks exercise `titanWait` directly — if `titanWait` were missing, those specs would throw `titanWait is not a function`.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/poll.js tests/e2e/fixtures.js
git commit -m "test(e2e): add in-page titanWait poll helper, installed by login"
```

---

## Task 2: Convert roll-settle sites (5)

**Files:**
- Modify: `tests/e2e/checks-opposed.spec.js` (3 sites), `tests/e2e/effect-checks.spec.js` (1), `tests/e2e/interaction-rolls.spec.js` (1)

Each site is inside a `page.evaluate` that already captures `const before = game.messages.size;` before the roll, sleeps, then reads `game.messages.contents[game.messages.size - 1]`. Replace the sleep with a wait for the new message.

- [ ] **Step 1: `checks-opposed.spec.js` — 3 sites**

In `rollAttackWithTargets` (≈line 73) and the two resistance evaluates (≈lines 219, 260), replace each:
```javascript
         await new Promise((resolve) => {
            setTimeout(resolve, 300);
         });
```
with:
```javascript
         await titanWait(() => game.messages.size > before, { message: 'new chat message' });
```
(`before` is already in scope in each evaluate. The very next line reads the newest message — now guaranteed present.)

- [ ] **Step 2: `effect-checks.spec.js` — 1 site (≈line 109)**

Replace:
```javascript
         await new Promise((resolve) => {
            setTimeout(resolve, 500);
         });
```
with:
```javascript
         await titanWait(() => game.messages.size > before, { message: 'new chat message' });
```

- [ ] **Step 3: `interaction-rolls.spec.js` — 1 site (≈line 159)**

Replace:
```javascript
            await new Promise((resolve) => {
               setTimeout(resolve, 500);
            });
```
with:
```javascript
            await titanWait(() => game.messages.size > before, { message: 'new chat message' });
```

- [ ] **Step 4: Verify (world launched)**

Run: `npx playwright test tests/e2e/checks-opposed.spec.js tests/e2e/effect-checks.spec.js tests/e2e/interaction-rolls.spec.js`
Expected: PASS (all message reads now wait on the actual creation, not a fixed delay).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/checks-opposed.spec.js tests/e2e/effect-checks.spec.js tests/e2e/interaction-rolls.spec.js
git commit -m "test(e2e): poll for new chat message instead of fixed sleep (roll-settle)"
```

---

## Task 3: Convert the shared `renderSheet` helper

**Files:**
- Modify: `tests/e2e/fixtures.js` (`renderSheet`, ≈lines 62–67)

`renderSheet` renders a sheet inside `page.evaluate`, sleeps 500ms, returns, then asserts `await expect(page.locator(expectedSelector).first()).toBeVisible()` from Node. Playwright's `toBeVisible()` auto-retries, so the sleep is redundant.

- [ ] **Step 1: Remove the redundant sleep**

In `renderSheet`'s `page.evaluate` body, delete:
```javascript
      // Allow the Svelte mount and ApplicationV2 render cycle to settle.
      await new Promise((resolve) => {
         setTimeout(resolve, 500);
      });
```
Leave `await doc.sheet.render(true);` and `return true;`. The Node-side `await expect(page.locator(expectedSelector).first()).toBeVisible()` already waits for the mounted element.

- [ ] **Step 2: Verify (world launched)**

Run: `npx playwright test tests/e2e/render-smoke.spec.js`
Expected: PASS (render-smoke drives `renderSheet` for player/npc actors, all item subtypes, and the effect sheet; `toBeVisible` covers the wait).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/fixtures.js
git commit -m "test(e2e): drop redundant settle in renderSheet (toBeVisible auto-retries)"
```

---

## Task 4: Convert inline render-settles — sheet/item specs

**Files (each has the pattern `await <doc>.sheet.render(true); await new Promise(r => setTimeout(r, N));` inside a `page.evaluate`, followed by an in-page DOM read):**
- `tests/e2e/reactive-ability.spec.js` (44), `reactive-armor-shield.spec.js` (50), `reactive-spell.spec.js` (48), `reactive-weapon.spec.js` (47), `reactive-expanded-toggle.spec.js` (34), `reactive-effect-rows.spec.js` (46), `reactive-inventory-basic.spec.js` (52, 133), `spells-filter.spec.js` (27)

**Conversion recipe (apply per site):** delete the `await new Promise(r => setTimeout(r, N))` and replace it with a `titanWait` whose predicate is the exact condition the code checks next. Read each site's following lines to find that condition:
- If the next step reads/asserts a specific element, wait for it: `await titanWait(() => !!<that element query>, { message: '<desc>' })`.
- If the next step reads a derived/computed value off the rendered sheet, wait for the sheet's mounted content first: `await titanWait(() => !!app?.element?.querySelector('.window-content')?.children.length, { message: 'sheet mounted' })` (where `app` is the value returned by `sheet.render(true)`; capture it as `const app = await <doc>.sheet.render(true);` if not already).

**Worked exemplar** (`reactive-weapon.spec.js`, ≈line 45-47) — current:
```javascript
         await actor.sheet.render(true);
         await new Promise((resolve) => {
            setTimeout(resolve, 600);
         });
         // (next: queries the weapon row in the rendered sheet DOM)
```
becomes:
```javascript
         const app = await actor.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'actor sheet mounted' },
         );
```
(If the test's subsequent assertion targets a more specific element, prefer waiting on THAT element instead.)

- [ ] **Step 1: Convert each file's render-settle site(s)** using the recipe above. For every converted file, read the lines AFTER the old sleep to pick the precise predicate.

- [ ] **Step 2: Verify each converted spec (world launched)**

Run them in one batch:
`npx playwright test tests/e2e/reactive-ability.spec.js tests/e2e/reactive-armor-shield.spec.js tests/e2e/reactive-spell.spec.js tests/e2e/reactive-weapon.spec.js tests/e2e/reactive-expanded-toggle.spec.js tests/e2e/reactive-effect-rows.spec.js tests/e2e/reactive-inventory-basic.spec.js tests/e2e/spells-filter.spec.js`
Expected: PASS. If any spec flakes/fails because the awaited render predicate was too loose, tighten that site's predicate to the specific element it asserts and re-run that spec.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/reactive-*.spec.js tests/e2e/spells-filter.spec.js
git commit -m "test(e2e): poll for mounted sheet instead of fixed sleep (reactive specs)"
```

---

## Task 5: Convert inline render-settles — effect/header/trait/misc specs

**Files:** `editor-description.spec.js` (31), `effect-reactivity.spec.js` (34), `effect-sheet-layout.spec.js` (34), `effect-traits.spec.js` (47), `header-buttons.spec.js` (20, 98), `header-controls.spec.js` (28), `interaction-dialogs.spec.js` (41), `rules-element-crud.spec.js` (32, 85), `trait-add-custom.spec.js` (55), `traits.spec.js` (60)

Same recipe as Task 4 (delete the fixed sleep; replace with `titanWait` on the condition the test checks next — a specific element when the test targets one, else the mounted-content predicate). Notes on the non-`sheet.render` shapes:
- `header-buttons.spec.js` already does `const app = await doc.sheet.render(true);` — use `app.element` in the predicate.
- `interaction-dialogs.spec.js` (≈line 40) runs `await new Function(... src ...)()` then sleeps for a dialog to appear; wait for the dialog element instead: `await titanWait(() => !!document.querySelector('.application.dialog, .titan.dialog'), { message: 'dialog open' })` — read the spec's following assertion to confirm the exact dialog selector it checks, and use that.
- `editor-description.spec.js` (≈line 29) renders then waits for the ProseMirror/editor region the test reads — wait on that specific element.

- [ ] **Step 1: Convert each file's site(s)** per the recipe, reading each site's following assertion for the predicate.

- [ ] **Step 2: Verify each converted spec (world launched)**

`npx playwright test tests/e2e/editor-description.spec.js tests/e2e/effect-reactivity.spec.js tests/e2e/effect-sheet-layout.spec.js tests/e2e/effect-traits.spec.js tests/e2e/header-buttons.spec.js tests/e2e/header-controls.spec.js tests/e2e/interaction-dialogs.spec.js tests/e2e/rules-element-crud.spec.js tests/e2e/trait-add-custom.spec.js tests/e2e/traits.spec.js`
Expected: PASS. Tighten any too-loose predicate and re-run that spec if needed.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/editor-description.spec.js tests/e2e/effect-reactivity.spec.js tests/e2e/effect-sheet-layout.spec.js tests/e2e/effect-traits.spec.js tests/e2e/header-buttons.spec.js tests/e2e/header-controls.spec.js tests/e2e/interaction-dialogs.spec.js tests/e2e/rules-element-crud.spec.js tests/e2e/trait-add-custom.spec.js tests/e2e/traits.spec.js
git commit -m "test(e2e): poll for mounted sheet/dialog instead of fixed sleep (effect/header/trait specs)"
```

---

## Task 6: Confirm no in-scope sleeps remain + full regression

**Files:** none (verification).

- [ ] **Step 1: Confirm the in-scope sleeps are gone**

Run: `git grep -n "setTimeout" -- tests/e2e`
Expected: the only remaining `setTimeout` matches are (a) inside `tests/e2e/poll.js` (the helper's own interval timer) and (b) the deferred Phase-1b files: `effect-tray.spec.js`, `localization.spec.js`, `logic/rules-elements.spec.js`, `logic/conditions.spec.js`, `permissions-auto-open.spec.js`. No render-settle/roll-settle sleeps remain in the in-scope specs.

- [ ] **Step 2: Full suite regression (world launched)**

Run: `npm run test:e2e`
Expected: green at parity with the pre-change pass count (358), and a lower wall-clock than the pre-change baseline. Capture the new wall-clock to record the improvement.

- [ ] **Step 3: Commit any fixes** (only if a spec needed a tightened predicate)

```bash
git add -A tests/e2e
git commit -m "test(e2e): tighten poll predicates surfaced by full-suite regression"
```

---

## Self-Review

**Spec coverage (Workstream A, Phase 1 sleeps→polling portion):**
- Polling helper → Task 1. ✓
- Roll-settle (5) → Task 2 (exact conversions; uniform `game.messages.size > before`). ✓
- `renderSheet` shared helper → Task 3 (drop sleep; `toBeVisible` auto-retries). ✓
- Inline render-settle (~32) → Tasks 4–5 (recipe + worked exemplar + per-file verify; predicate = the condition the test checks next). ✓
- "Zero fixed sleeps in in-scope specs" success criterion → Task 6 Step 1. ✓
- Full-suite green + faster → Task 6 Step 2. ✓
- Hygiene helper (close-apps / chat-clear) and the shared-world harness are explicitly NOT in this slice — they belong to the broader Phase 1/Phase 2 of the spec; this plan is the sleep-removal slice only. (Noted so a reader doesn't expect them here.)

**Placeholder scan:** Task 1–3 are fully exact. Tasks 4–5 use a recipe + a worked exemplar + an explicit per-site rule ("wait for the condition the test checks next") + per-spec verification — appropriate for a multi-file mechanical sweep where each predicate is read from the adjacent assertion; not a vague placeholder. No "TBD"/"handle edge cases".

**Consistency:** `titanWait(predicate, { message })` signature is identical across Tasks 1, 2, 4, 5. `installPoll(page)` called once in `login`. The deferred file list in Scope matches Task 6 Step 1's expected-remaining list.
