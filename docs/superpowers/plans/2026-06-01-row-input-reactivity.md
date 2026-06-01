# Row-Input Reactivity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the three stale character-sheet row inputs (effect duration `remaining` + `initiative`, commodity `quantity`) reactive to external in-place document updates, and commit on the +/- buttons, by switching them to Svelte 5 function bindings.

**Architecture:** Each input changes from two-way `bind:value={<childDoc>.system.<leaf>}` to a function binding `bind:value={getter, setter}` — the getter reads through the reactive `document.data.<collection>.get(id)?.system.<leaf>` bridge (so external/turn updates re-render in place), the setter commits via `<childDoc>.update(...)` (so typing AND the +/- buttons persist). The shared primitives are untouched.

**Tech Stack:** Svelte 5.55.10 (function bindings, ≥5.9.0), Foundry VTT v14, Playwright e2e (the `npm run build:e2e` bundle), vitest.

**Spec:** `docs/superpowers/specs/2026-06-01-row-input-reactivity-design.md`

**Working agreements:** Route all `.svelte` work through the `titan-svelte-dev` subagent (loads `svelte-5`/`foundry-vtt`/`foundry-svelte`/`titan-codebase`). Follow `.claude/CLAUDE.md` style (120-col, multi-line conditional scopes, typed props with comments). Stay on `development`. After any `src/` edit run `npm run build:e2e` so the live Foundry on :30000 serves the change AND keeps the gated probe. Build output (`index.js`/`style.css`) is gitignored — never `git add` it. Number inputs commit on a **dispatched keyup** (`input.fill(v); input.dispatchEvent('keyup', { key: 'End' })`) — `.fill()` alone updates the string but does not key up.

---

## File Structure

- **Modify** `src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte` — two inputs (`remaining`, `initiative`).
- **Modify** `src/document/types/actor/types/character/sheet/items/commodity/CharacterSheetCommodity.svelte` — one input (`quantity`).
- **Modify** `tests/e2e/reactive-effect-rows.spec.js` — add input reactivity/commit tests (reuse existing `beforeEach`).
- **Modify** `tests/e2e/reactive-inventory-basic.spec.js` — add a self-contained commodity-quantity input test.
- **Modify** `.claude/skills/titan-codebase/references/conventions.md` and `docs/superpowers/e2e-suite-status.md` — docs.

---

## Task 1: Effect duration inputs (remaining + initiative)

**Files:**
- Modify: `tests/e2e/reactive-effect-rows.spec.js`
- Modify: `src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte`

- [ ] **Step 1: Add the failing input tests**

In `tests/e2e/reactive-effect-rows.spec.js`, add these two tests INSIDE the existing
`test.describe('character sheet effect row reactivity', …)` block, after the existing test (they reuse the
`beforeEach` that seeds a `turnStart` effect with `remaining: 1` and opens the Effects tab):

```js
   test('duration remaining input reflects an external in-place update and persists edits', async ({
      page,
   }) => {
      // The effect row, and its remaining duration input (a turnStart effect renders only the remaining
      // field, so the first number input is `remaining`).
      const row = page.locator('[data-effect-id]').first();
      const remainingInput = row.locator('input[type="number"]').first();

      // INITIAL rendered state: remaining is 1.
      await expect(remainingInput, 'initial remaining input value is 1').toHaveValue('1');

      // REACTIVITY: mutate the effect's remaining externally; the input must update in place (no remount).
      await page.evaluate(async (actorName) => {
         const actor = game.actors.getName(actorName);
         await actor.effects.contents[0].update({ system: { duration: { remaining: 5 } } });
      }, ACTOR_NAME);
      await page.waitForTimeout(400);
      await expect(remainingInput, 'remaining input updated to 5 in place').toHaveValue('5');

      // TYPING COMMIT (regression lock): type a new value; it must persist to the document.
      await remainingInput.fill('8');
      await remainingInput.dispatchEvent('keyup', { key: 'End' });
      await page.waitForTimeout(400);
      const typed = await page.evaluate((actorName) => {
         return game.actors.getName(actorName).effects.contents[0].system.duration.remaining;
      }, ACTOR_NAME);
      expect(typed, 'typed remaining persisted to the document').toBe(8);

      // INCREMENT COMMIT (latent-bug regression): clicking + must persist the incremented value.
      await row.locator('.increment button').first().click();
      await page.waitForTimeout(400);
      const incremented = await page.evaluate((actorName) => {
         return game.actors.getName(actorName).effects.contents[0].system.duration.remaining;
      }, ACTOR_NAME);
      expect(incremented, 'increment button persisted to the document').toBe(9);
   });

   test('duration initiative input reflects an external in-place update and persists edits', async ({
      page,
   }) => {
      // Reconfigure the seeded effect to an 'initiative' duration so the initiative IntegerInput renders.
      // durationType is a reactive derived, so the initiative field appears in place (no remount).
      await page.evaluate(async (actorName) => {
         const actor = game.actors.getName(actorName);
         await actor.effects.contents[0].update({
            system: { duration: { type: 'initiative', initiative: 3 } },
         });
      }, ACTOR_NAME);
      await page.waitForTimeout(400);

      // With an 'initiative' duration the initiative input renders FIRST (remaining is second).
      const row = page.locator('[data-effect-id]').first();
      const initiativeInput = row.locator('input[type="number"]').first();

      // INITIAL rendered state: initiative is 3.
      await expect(initiativeInput, 'initial initiative input value is 3').toHaveValue('3');

      // REACTIVITY: external update must reflect in place.
      await page.evaluate(async (actorName) => {
         const actor = game.actors.getName(actorName);
         await actor.effects.contents[0].update({ system: { duration: { initiative: 6 } } });
      }, ACTOR_NAME);
      await page.waitForTimeout(400);
      await expect(initiativeInput, 'initiative input updated to 6 in place').toHaveValue('6');

      // TYPING COMMIT: type a new value; it must persist.
      await initiativeInput.fill('2');
      await initiativeInput.dispatchEvent('keyup', { key: 'End' });
      await page.waitForTimeout(400);
      const typed = await page.evaluate((actorName) => {
         return game.actors.getName(actorName).effects.contents[0].system.duration.initiative;
      }, ACTOR_NAME);
      expect(typed, 'typed initiative persisted to the document').toBe(2);
   });
```

- [ ] **Step 2: Build and run the tests RED**

Run: `npm run build:e2e` (rebuilds from current, still-buggy source), then
`npx playwright test reactive-effect-rows.spec.js --reporter=list`
Expected: the two NEW tests FAIL — the reactivity assertions fail (input stays `1`/`3` after the external
update because `effect.system.x` is a non-reactive prop read) and the increment-commit assertion fails
(the +/- button mutates the prop but never persists). The pre-existing footer test and the typing-commit
assertions still pass.

- [ ] **Step 3: Switch both inputs to function bindings**

In `CharacterSheetEffect.svelte`, replace the `initiative` `IntegerInput` block. Old:

```svelte
                  <IntegerInput
                     min={0}
                     bind:value={effect.system.duration.initiative}
                     onchange={() => {
                           effect.update({
                              system: {
                                 duration: {
                                    initiative:
                                       effect.system.duration.initiative,
                                 },
                              },
                           });
                        }}
                  />
```

New:

```svelte
                  <IntegerInput
                     min={0}
                     bind:value={
                        () => document.data.effects.get(effect.id)?.system.duration.initiative ?? 0,
                        (newValue) => effect.update({ system: { duration: { initiative: newValue } } })
                     }
                  />
```

Then replace the `remaining` `IntegerIncrementInput` block. Old:

```svelte
               <IntegerIncrementInput
                  min={0}
                  bind:value={effect.system.duration.remaining}
                  onchange={() => {
                        effect.update({
                           system: {
                              duration: {
                                 remaining: effect.system.duration.remaining,
                              },
                           },
                        });
                     }}
               />
```

New:

```svelte
               <IntegerIncrementInput
                  min={0}
                  bind:value={
                     () => document.data.effects.get(effect.id)?.system.duration.remaining ?? 0,
                     (newValue) => effect.update({ system: { duration: { remaining: newValue } } })
                  }
               />
```

(Note: the function binding takes two comma-separated expressions — getter, then setter — with NO trailing
comma after the setter.)

- [ ] **Step 4: Rebuild and run the tests GREEN**

Run: `npm run build:e2e`, then `npx playwright test reactive-effect-rows.spec.js --reporter=list`
Expected: all tests in the file PASS (the original footer test + both new input tests).

- [ ] **Step 5: Commit**

```bash
git add src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte tests/e2e/reactive-effect-rows.spec.js
git commit -m "fix(sheet): effect duration inputs reactive via function bindings"
```

---

## Task 2: Commodity quantity input

**Files:**
- Modify: `tests/e2e/reactive-inventory-basic.spec.js`
- Modify: `src/document/types/actor/types/character/sheet/items/commodity/CharacterSheetCommodity.svelte`

- [ ] **Step 1: Add the failing input test**

In `tests/e2e/reactive-inventory-basic.spec.js`, add this self-contained test INSIDE the existing
`test.describe('character sheet inventory row reactivity', …)` block (it seeds its own actor + commodity
with a known starting `quantity` of 2):

```js
   test('commodity quantity input reflects an external in-place update and persists edits', async ({
      page,
   }) => {
      const ACTOR = 'E2E Reactive Commodity Quantity Actor';
      await login(page);

      // Seed a commodity with a known starting quantity and render the sheet.
      await page.evaluate(async (actorName) => {
         const stale = game.actors.getName(actorName);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name: actorName, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [
            { name: 'E2E Reactive Commodity Qty', type: 'commodity', system: { quantity: 2 } },
         ]);
         await actor.sheet.render(true);
         await new Promise((resolve) => {
            setTimeout(resolve, 600);
         });
      }, ACTOR);

      // Activate the Inventory tab and locate the commodity row's quantity input.
      await page.getByText('Inventory', { exact: true }).first().click();
      await page.waitForTimeout(400);
      const row = page.locator('[data-item-id]').first();
      const quantityInput = row.locator('input[type="number"]').first();

      // INITIAL rendered state: quantity is 2.
      await expect(quantityInput, 'initial quantity input value is 2').toHaveValue('2');

      // REACTIVITY: external update must reflect in place.
      await page.evaluate(async (actorName) => {
         const actor = game.actors.getName(actorName);
         await actor.items.contents[0].update({ system: { quantity: 5 } });
      }, ACTOR);
      await page.waitForTimeout(400);
      await expect(quantityInput, 'quantity input updated to 5 in place').toHaveValue('5');

      // TYPING COMMIT (regression lock).
      await quantityInput.fill('8');
      await quantityInput.dispatchEvent('keyup', { key: 'End' });
      await page.waitForTimeout(400);
      let qty = await page.evaluate((actorName) => {
         return game.actors.getName(actorName).items.contents[0].system.quantity;
      }, ACTOR);
      expect(qty, 'typed quantity persisted to the document').toBe(8);

      // INCREMENT COMMIT (latent-bug regression).
      await row.locator('.increment button').first().click();
      await page.waitForTimeout(400);
      qty = await page.evaluate((actorName) => {
         return game.actors.getName(actorName).items.contents[0].system.quantity;
      }, ACTOR);
      expect(qty, 'increment button persisted quantity').toBe(9);
   });
```

- [ ] **Step 2: Build and run the test RED**

Run: `npm run build:e2e`, then `npx playwright test reactive-inventory-basic.spec.js --reporter=list`
Expected: the new test FAILS on the reactivity assertion (input stays `2` after the external update) and
the increment-commit assertion (+/- does not persist). The pre-existing footer tests + the typing-commit
assertion pass.

- [ ] **Step 3: Switch the quantity input to a function binding**

In `CharacterSheetCommodity.svelte`, replace the `quantity` `IntegerIncrementInput` block. Old:

```svelte
         <IntegerIncrementInput
            bind:value={item.system.quantity}
            onchange={() => {
                  item.update({
                     system: {
                        quantity: item.system.quantity,
                     },
                  });
               }}
         />
```

New:

```svelte
         <IntegerIncrementInput
            bind:value={
               () => document.data.items.get(item._id)?.system.quantity ?? 0,
               (newValue) => item.update({ system: { quantity: newValue } })
            }
         />
```

(Uses `item._id` to match this file's existing `document.data.items.get(item._id)` derived reads.)

- [ ] **Step 4: Rebuild and run the test GREEN**

Run: `npm run build:e2e`, then `npx playwright test reactive-inventory-basic.spec.js --reporter=list`
Expected: all tests in the file PASS.

- [ ] **Step 5: Commit**

```bash
git add src/document/types/actor/types/character/sheet/items/commodity/CharacterSheetCommodity.svelte tests/e2e/reactive-inventory-basic.spec.js
git commit -m "fix(sheet): commodity quantity input reactive via function binding"
```

---

## Task 3: Documentation + full-suite verification

**Files:**
- Modify: `.claude/skills/titan-codebase/references/conventions.md`
- Modify: `docs/superpowers/e2e-suite-status.md`

- [ ] **Step 1: Document the row-input convention**

In `.claude/skills/titan-codebase/references/conventions.md`, find the existing row display-read
reactivity recipe (the bug-#15 rule: "re-read each DISPLAY value through
`$derived(document.data.<collection>.get(id)?.system.<leaf>)`"). Immediately after it, add the row-INPUT
companion rule:

> **Row INPUTS (two-way) to a child-doc leaf:** a `$derived` is read-only, so you cannot `bind:value` to
> it. Instead use a Svelte 5 **function binding** whose getter reads through the bridge and whose setter
> commits via the child document's own `update()`:
> `bind:value={() => document.data.<coll>.get(id)?.system.<leaf> ?? <fallback>, (v) => <childDoc>.update({ system: { <leaf>: v } })}`.
> Never `bind:value={<prop>.system.<leaf>}` on a row — it reads the non-reactive passed prop (stale until
> remount) and, on `IntegerIncrementInput`, the +/- buttons never persist (they mutate the prop but never
> fire `onchange`). The `?? <fallback>` guards the mid-deletion transient where the derived is `undefined`
> (`NumberInput` would throw at `value.toString()`). The `document.data.system.*` bindings on a document's
> OWN sheet are already reactive and do not need this.

- [ ] **Step 2: Mark follow-up #2 done in the status doc**

In `docs/superpowers/e2e-suite-status.md`:
- In the "Open follow-ups" block, change item (2) from OPEN to **DONE (2026-06-01)**, citing this
  spec/plan and noting the function-binding approach (3 row inputs; primitives untouched) and the latent
  +/- non-persist fix.
- Update the "Deferred (optional, not Phase 4)" block (the effect-duration INPUTS entry) to **DONE**, with
  a one-line note that the fix was function bindings, not the originally-anticipated primitive refactor.
- Bump the e2e pass count in the "How to verify" section from **312** to the new total after this plan's
  added tests (3 new tests → **315**; confirm against the actual green run in Step 3 and write the real
  number).

- [ ] **Step 3: Full-suite verification**

Run: `npm run build:e2e`, then `npx vitest run` (expect **39**, unchanged) and
`npx playwright test --reporter=list` (expect the prior 312 + the 3 new reactive input tests = **315**;
confirm the exact number and that nothing regressed). If the count differs, reconcile the status-doc number
in Step 2 to the actual green total before committing.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/titan-codebase/references/conventions.md docs/superpowers/e2e-suite-status.md
git commit -m "docs(sheet): record row-input function-binding reactivity recipe"
```

---

## Self-Review (completed)

**Spec coverage:** effect remaining + initiative function bindings (Task 1 Step 3) ✓; commodity quantity
function binding (Task 2 Step 3) ✓; reactive getter through `document.data` + `?? 0` fallback ✓; committing
setter replacing inline `onchange` ✓; +/- commit latent-bug fix asserted (Task 1/2 increment tests) ✓;
e2e tests reactivity [red→green] + typing-commit [lock] + increment-commit [red→green] ✓; docs incl.
conventions recipe + status (Task 3) ✓.

**Placeholder scan:** no TBD/TODO; all code blocks are complete old→new replacements and full test bodies.
The only deferred-to-runtime value is the final e2e pass count (Task 3 Step 2/3), which is explicitly
reconciled against the green run — not a placeholder.

**Type/shape consistency:** the function-binding form (`() => document.data.<coll>.get(<idField>)?.system.<leaf> ?? 0,
(newValue) => <childDoc>.update({ system: { <leaf>: newValue } })`) is identical across all three sites,
differing only in collection (`effects`/`items`), id field (`effect.id`/`item._id`), and leaf
(`duration.remaining`/`duration.initiative`/`quantity`) — each matching its file's existing derived reads.
Test locators (`[data-effect-id]`/`[data-item-id]`, `input[type="number"]`, `.increment button`) match the
existing specs' conventions, and the keyup-commit incantation matches `checkDialog.js`.
