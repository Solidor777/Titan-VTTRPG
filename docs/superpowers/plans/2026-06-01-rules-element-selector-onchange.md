# Rules-element selector `onchange` forwarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per project CLAUDE.md, route all `.js` / `.svelte` edits to the `titan-svelte-dev` subagent with the `svelte-5`, `foundry-vtt`, and `foundry-svelte` skills loaded.

**Goal:** Make `DocumentSelect` forward a consumer `onchange` so the six rules-element settings components' curated default-key reset actually runs when the selector changes, and retire the dead/broken owner-guard in those handlers.

**Architecture:** `DocumentSelect` gains an optional `onchange` prop that runs (as a pure in-memory mutation) immediately before its existing `refreshSystemDocument` persist — one `update()` per change. The six handler functions drop their `assert(document?.isOwner, …)` guard and their own `document.data.update(...)`, becoming pure key-setters; owner-gating + persistence live solely in `DocumentSelect` (which disables for non-owners) and `refreshSystemDocument` (which guards `document?.isOwner` on the real doc it is handed).

**Tech Stack:** Svelte 5 (runes) mounted in Foundry VTT v14 ApplicationV2; Vite build to repo root; Playwright e2e (`@playwright/test`); Vitest unit.

**Spec:** `docs/superpowers/specs/2026-06-01-rules-element-selector-onchange-design.md`

---

## File Structure

- **Modify** `src/document/svelte-components/select/DocumentSelect.svelte` — add + forward an optional `onchange` prop; compose it before `refreshSystemDocument`.
- **Modify** (handlers become pure key-setters — identical transform in each):
  - `src/document/types/item/sheet/rules-element/ItemSheetFlatModifierSettings.svelte` — `onSelectorChange`
  - `src/document/types/item/sheet/rules-element/ItemSheetMulSumSettings.svelte` — `onSelectorChange`
  - `src/document/types/item/sheet/rules-element/ItemSheetMulBaseSettings.svelte` — `onSelectorChange`
  - `src/document/types/item/sheet/rules-element/ItemSheetSetSumSettings.svelte` — `onSelectorChange`
  - `src/document/types/item/sheet/rules-element/ItemSheetConditionalRatingModifierSettings.svelte` — `onSelectorChange` (its `onRatingChange` already has no guard/update; leave it)
  - `src/document/types/item/sheet/rules-element/ItemSheetRollMessageSettings.svelte` — `onSelectorChange` (its `onCheckTypeChange` already has no guard/update; leave it)
- **Modify (test)** `tests/e2e/rules-element-crud.spec.js` — add one UI-driven regression case.

---

### Task 1: Failing e2e regression test

**Files:**
- Test: `tests/e2e/rules-element-crud.spec.js`

Adds a second `test.describe` reusing the same clean-weapon + rules-element-tab harness. A freshly-added rules element defaults to `flatModifier` / selector `attribute` / key `body` (`src/document/types/item/rules-element/FlatModifier.js`). Changing the selector to `resource` should set the key to the curated default `resolve`. The `resource` key-select uses `allowAll`, so its option order is `['all', 'stamina', 'resolve', 'wounds']` — without the fix the clamp `$effect` snaps the (now-invalid `body`) key to the **first** option `'all'`; with the fix `onSelectorChange` sets it to `'resolve'`. Asserting `=== 'resolve'` therefore distinguishes the fix from the clamp fallback.

Row markup (`ItemSheetRulesElementSettings.svelte`): the operation `<select>` lives under `.rules-element .operation`; the operation-specific selector + key selects live under `.rules-element .operation-settings .settings .field.select` (first = selector, second = key). Target the selector via `.operation-settings .field.select` `.first()`.

- [ ] **Step 1: Add the failing test**

Append to `tests/e2e/rules-element-crud.spec.js` (after the existing `test.describe(...)` block, before EOF):

```js
test.describe('rules-element selector default key', () => {
   const ITEM_NAME_SELECTOR = 'E2E RulesElement Selector Item';

   test.beforeEach(async ({ page }) => {
      await login(page);

      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Item?.dataModels?.weapon);
      expect(ready, 'TITAN system failed to initialize').toBe(true);

      // Rebuild a clean weapon (no rules elements) and render its sheet.
      await page.evaluate(async (name) => {
         const stale = game.items.getName(name);
         if (stale) {
            await stale.delete();
         }
         const item = await Item.create({ name, type: 'weapon' });
         await item.sheet.render(true);
         await new Promise((resolve) => {
            setTimeout(resolve, 500);
         });
      }, ITEM_NAME_SELECTOR);

      // Activate the Rules Elements tab so its list and Add button render.
      const label = await page.evaluate(() => game.i18n.localize('LOCAL.rulesElements.text'));
      await page.locator('.tab-list').getByText(label, { exact: true }).click();
      await page.waitForTimeout(300);
   });

   test('changing the selector resets the key to the curated default', async ({ page }) => {
      // Add a flatModifier element (defaults: selector "attribute", key "body").
      await page.locator('.add-entry-button button').click();
      await page.waitForTimeout(400);

      const seeded = await page.evaluate((name) => {
         const el = game.items.getName(name).system.rulesElement[0];
         return { operation: el.operation, selector: el.selector, key: el.key };
      }, ITEM_NAME_SELECTOR);
      expect(seeded, 'seeded default flatModifier element').toEqual({
         operation: 'flatModifier',
         selector: 'attribute',
         key: 'body',
      });

      // Change the operation-specific SELECTOR dropdown to "resource".
      const selector = page.locator('.rules-element .operation-settings .field.select select').first();
      await selector.selectOption('resource');
      await page.waitForTimeout(400);

      // The key must land on the curated default "resolve", NOT the clamp's first option "all".
      const key = await page.evaluate((name) =>
         game.items.getName(name).system.rulesElement[0].key, ITEM_NAME_SELECTOR);
      expect(key, 'curated default key for the resource selector').toBe('resolve');

      // The retired owner-guard must not have surfaced an error toast.
      await expect(page.locator('.notification.error')).toHaveCount(0);
   });
});
```

- [ ] **Step 2: Build the current system so Foundry serves it, then run the new test — expect RED**

Run:
```bash
npm run build:e2e
npm run test:e2e -- rules-element-crud.spec.js
```
Expected: the new test FAILS at `expect(key … ).toBe('resolve')` with received `"all"` (the existing add/delete test still passes). This confirms the bug: the curated reset never runs and the clamp falls back to the first option.

Do **not** commit yet — a red test is committed together with its fix in Task 4.

---

### Task 2: Forward `onchange` through `DocumentSelect`

**Files:**
- Modify: `src/document/svelte-components/select/DocumentSelect.svelte`

- [ ] **Step 1: Add the `onchange` prop and document it**

In the `DocumentSelectProps` `@typedef` (after the `tooltip` line), add:

```js
    * @property {() => void} [onchange] - Optional callback fired (as a pure mutation) before the document is persisted.
```

In the `$props()` destructure, add `onchange`:

```js
   /** @type {DocumentSelectProps} */
   let {
      value = $bindable(void 0),
      options = void 0,
      disabled = false,
      tooltip = void 0,
      onchange = void 0,
   } = $props();
```

- [ ] **Step 2: Compose the consumer callback before the persist**

Replace the `<Select … />` markup's `onchange` line. Change from:

```svelte
   onchange={() => refreshSystemDocument(document.data, disabled)}
```

to:

```svelte
   onchange={() => {
      onchange?.();
      refreshSystemDocument(document.data, disabled);
   }}
```

The consumer mutation must run **before** `refreshSystemDocument` clones `document.system`, so the new key is included in the persisted payload and is already valid when the new key-select mounts.

- [ ] **Step 3: Type-check the edit compiles (build)**

Run:
```bash
npm run build:e2e
```
Expected: build succeeds with no Svelte/Vite errors.

---

### Task 3: Make the six handlers pure key-setters

**Files (identical transform in each):**
- Modify: `src/document/types/item/sheet/rules-element/ItemSheetFlatModifierSettings.svelte`
- Modify: `src/document/types/item/sheet/rules-element/ItemSheetMulSumSettings.svelte`
- Modify: `src/document/types/item/sheet/rules-element/ItemSheetMulBaseSettings.svelte`
- Modify: `src/document/types/item/sheet/rules-element/ItemSheetSetSumSettings.svelte`
- Modify: `src/document/types/item/sheet/rules-element/ItemSheetConditionalRatingModifierSettings.svelte`
- Modify: `src/document/types/item/sheet/rules-element/ItemSheetRollMessageSettings.svelte`

**The transform.** In each file's `onSelectorChange`, the body currently looks like this canonical shape (the `switch` contents differ per file and are preserved verbatim; in `ItemSheetRollMessageSettings.svelte` the cases assign `element.key = …` instead of `document.data.system.rulesElement[idx].key = …` — also preserved verbatim):

```js
   function onSelectorChange() {
      if (assert(
         document?.isOwner,
         'Cannot modify document %s if not owner.',
         document?.name,
      )) {
         switch (/* …selector… */) {
            /* …cases that set key… (UNCHANGED) */
         }

         document.data.update({
            system: structuredClone(document.data.system),
         });
      }
   }
```

Rewrite it to drop the `assert` wrapper and the trailing `document.data.update(...)`, keeping only the (dedented) `switch`:

```js
   function onSelectorChange() {
      switch (/* …selector… */) {
         /* …cases that set key… (UNCHANGED, dedented one level) */
      }
   }
```

- [ ] **Step 1: Apply the transform to all six files**

For each of the six files: delete the `if (assert( document?.isOwner, 'Cannot modify document %s if not owner.', document?.name, )) {` opening, delete the matching closing `}`, delete the `document.data.update({ system: structuredClone(document.data.system) });` block, and dedent the surviving `switch` by one level. Leave every `case`/`key` assignment exactly as-is. In `ItemSheetConditionalRatingModifierSettings.svelte` and `ItemSheetRollMessageSettings.svelte`, do **not** touch `onRatingChange` / `onCheckTypeChange` — they already lack a guard/update and simply mutate then call `onSelectorChange`.

- [ ] **Step 2: Remove the now-unused `assert` import where it is no longer referenced**

For each of the six files, check whether `assert` is still used anywhere else in the file. In the four sum-operation files (`FlatModifier`, `MulSum`, `MulBase`, `SetSum`) `onSelectorChange` is the only `assert` user, so delete the line `import assert from '~/helpers/utility-functions/Assert.js';`. In `ConditionalRatingModifier` and `RollMessage`, grep the file for other `assert(` calls first; only remove the import if there are none remaining.

Run (per file, to confirm no dangling references before building):
```bash
grep -n "assert" src/document/types/item/sheet/rules-element/ItemSheetFlatModifierSettings.svelte
```
Expected: no remaining `assert(` usages and no orphaned `import assert …` line in files where it was removed.

- [ ] **Step 3: Build**

Run:
```bash
npm run build:e2e
```
Expected: build succeeds; no "assert is not defined" / unused-import lint surprises.

---

### Task 4: Verify green, run full suite + lint, commit

**Files:** none (verification + commit only)

- [ ] **Step 1: Run the regression test — expect GREEN**

Run:
```bash
npm run test:e2e -- rules-element-crud.spec.js
```
Expected: both the existing "adding then deleting…" test and the new "changing the selector resets the key…" test PASS. (`npm run build:e2e` was already run in Task 3 Step 3; rebuild if any source changed since.)

- [ ] **Step 2: Run the full unit + e2e suites**

Run:
```bash
npm test
npm run test:e2e
```
Expected: unit suite passes (baseline 64); e2e suite passes (baseline 329 + the 1 new case = 330). No regressions in the other rules-element / sheet specs.

- [ ] **Step 3: Lint**

Run:
```bash
npm run eslint
npm run stylelint
```
Expected: clean (no new errors introduced by the edits).

- [ ] **Step 4: Commit**

```bash
git add src/document/svelte-components/select/DocumentSelect.svelte \
        src/document/types/item/sheet/rules-element/ItemSheetFlatModifierSettings.svelte \
        src/document/types/item/sheet/rules-element/ItemSheetMulSumSettings.svelte \
        src/document/types/item/sheet/rules-element/ItemSheetMulBaseSettings.svelte \
        src/document/types/item/sheet/rules-element/ItemSheetSetSumSettings.svelte \
        src/document/types/item/sheet/rules-element/ItemSheetConditionalRatingModifierSettings.svelte \
        src/document/types/item/sheet/rules-element/ItemSheetRollMessageSettings.svelte \
        tests/e2e/rules-element-crud.spec.js
git commit -m "fix(rules-element): forward onchange through DocumentSelect; retire dead owner-guard (#1a)"
```

---

### Task 5: Update docs (backlog + codebase skill)

**Files:**
- Modify: `docs/TODO.md`
- Modify: `.claude/skills/titan-codebase/` (the reference doc describing `DocumentSelect` / rules-element settings, if one names this behavior)

- [ ] **Step 1: Mark backlog #1a complete**

In `docs/TODO.md` under "### 1a. Rules-element settings: `onSelectorChange` never fires", prepend a `**Status: COMPLETE.**` line summarizing the fix (DocumentSelect now forwards `onchange`; the six handlers became pure key-setters; owner-gating consolidated in `DocumentSelect`/`refreshSystemDocument`; covered by the new `rules-element-crud.spec.js` case). Keep the original description for history.

- [ ] **Step 2: Refresh the titan-codebase skill if it documents this control**

Run:
```bash
grep -rn "DocumentSelect\|onSelectorChange\|refreshSystemDocument" .claude/skills/titan-codebase/
```
If any reference describes `DocumentSelect` as not forwarding `onchange`, or describes the rules-element handlers as self-persisting, update it to reflect the current state (DocumentSelect forwards an optional `onchange` run before persist; rules-element selector handlers are pure key-setters). If there are no such references, no change is needed.

- [ ] **Step 3: Commit docs**

```bash
git add docs/TODO.md .claude/skills/titan-codebase/
git commit -m "docs(rules-element): close backlog #1a; sync codebase skill"
```

---

## Self-Review

**Spec coverage:**
- Spec "Change 1 — DocumentSelect forward + compose" → Task 2. ✅
- Spec "Change 2 — six handlers become pure key-setters" → Task 3 (incl. unused `assert` import cleanup). ✅
- Spec "Testing — path A (one representative UI case)" → Task 1 + Task 4 Step 1. ✅ (concrete discriminating pair `attribute`→`resource`, asserts `key === 'resolve'` and no error toast.)
- Spec "Risk / blast radius" (no behavior change for non-`onchange` consumers) → guarded by Task 4 Step 2 full-suite run. ✅
- Project CLAUDE.md: update `TODO.md` on spec completion + keep `titan-codebase` skill current → Task 5. ✅

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to". The handler transform shows the exact canonical before/after; per-file `switch` bodies are explicitly preserved verbatim (not rewritten), which is correct because they are unchanged by this work. ✅

**Type/name consistency:** `onchange` prop name matches `Select.svelte`'s existing `onchange`; `refreshSystemDocument(document.data, disabled)` signature unchanged; `ITEM_NAME_SELECTOR` is local to the new describe and does not collide with the existing `ITEM_NAME`. Locator `.rules-element .operation-settings .field.select select` matches `ItemSheetRulesElementSettings.svelte` markup. ✅

---

## Execution addendum — 7th component (added during execution)

A full sweep of `DocumentSelect onchange` consumers during execution found a seventh
component the original six-file audit missed: `ItemSheetConditionalCheckModifierSettings.svelte`
(invisible to the `document?.isOwner` grep because it has no `assert` guard). Since the
`DocumentSelect` fix is global, its three previously-dead handlers
(`onModifierTypeChanged`/`onCheckTypeChange`/`onSelectorChange`) began firing and
double-persisting. User-approved resolution: apply the same pure-mutator transform and
remove its obsolete boolean return-value protocol. No discriminating e2e is possible for it
(its curated defaults coincide with the `Select` clamp's first option), so it is verified by
full-suite regression. See the spec's "Addendum — 7th component" section.

Commits: `e67f9863` (DocumentSelect + six handlers + test), `d9a510a7`
(ConditionalCheckModifier), `f383b56a` (JSDoc follow-ups from code review).
