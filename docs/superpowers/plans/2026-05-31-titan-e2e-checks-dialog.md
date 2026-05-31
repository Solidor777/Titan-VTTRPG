# 2b-3 Checks-Dialog E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per `.claude/CLAUDE.md`, route ALL `.js` / `.svelte` work to the `titan-svelte-dev` subagent with `svelte-5` / `foundry-vtt` / `foundry-svelte` / `titan-codebase` skills loaded.

**Goal:** Prove the check-option dialog path for all five check types by driving each rendered Svelte dialog from Playwright — open via the gated `request<Type>Check`, mutate inputs, assert recomputed totals, click Roll, and verify the result via the 2b-2 forced-dice oracle.

**Architecture:** Add a `testId` prop to the three shared dialog wrappers (`CheckDialogField`, `CheckDialogSummary`, `CheckDialogBase`) and pass a stable key from each concrete field/summary component. A new Playwright helper (`tests/e2e/checkDialog.js`) opens dialogs and drives the native widgets (`<input type=number>` / `<select>` / checkbox-`<button>`). A new spec (`tests/e2e/checks-dialog.spec.js`) runs a uniform core test across all five types plus attribute- and attack-specific extras, reusing the 2b-2 builders, dice seam, and oracle unchanged.

**Tech Stack:** Foundry VTT v14, Svelte 5 runes, Playwright, Vite (build to repo root). Spec ref: `docs/superpowers/specs/2026-05-31-titan-e2e-checks-dialog-design.md`.

**Working agreements (carry through):** stay on `development`; never `git add` build output (`index.js`, `index.js.map`, `style.css`); rebuild with `npm run build` after any `src/` edit so the live Foundry on `:30000` serves the change; login as `E2E GM 1` (the `login()` default); leave `packs/effects/**` churn uncommitted.

---

## File structure

- **Modify (source, testId plumbing):**
  - `src/check/dialog/CheckDialogField.svelte` — add `testId` prop → `data-testid` on `.field`.
  - `src/check/dialog/CheckDialogSummary.svelte` — add `testId` prop → `data-testid` on `.tag`.
  - `src/check/dialog/CheckDialogBase.svelte` — pass `testId` to the Roll/Cancel `Button`s.
  - 18 concrete field/summary components (Task 2 table) — pass a stable `testId` key.
- **Create (tests):**
  - `tests/e2e/checkDialog.js` — dialog page-object helper.
  - `tests/e2e/checks-dialog.spec.js` — the 2b-3 spec.
- **Reuse unchanged:** `tests/shared/builders.js` (`buildE2ERoller*`), `tests/e2e/dice.js` (`forceDice`/`resetDice`), `tests/shared/checkOracle.js` (`expectedCheckResults`), `tests/e2e/fixtures.js` (`login`).

---

## Task 1: testId on the three shared dialog wrappers

**Files:**
- Modify: `src/check/dialog/CheckDialogField.svelte`
- Modify: `src/check/dialog/CheckDialogSummary.svelte`
- Modify: `src/check/dialog/CheckDialogBase.svelte`

- [ ] **Step 1: Add `testId` to `CheckDialogField.svelte`**

In the `@typedef`/props block, add the prop (typed, single-line comment per `.claude/CLAUDE.md`), and apply it to the `.field` div.

Add to the typedef (after the `inputProps` line):

```javascript
    * @property {string} [testId] The stable `data-testid` applied to the field wrapper.
```

Change the destructure:

```javascript
   /** @type {CheckDialogFieldProps} */
   let {
      label = undefined,
      value = $bindable(undefined),
      input = undefined,
      tooltip = undefined,
      inputProps = undefined,
      testId = undefined,
   } = $props();
```

Change the wrapper element:

```svelte
<!--Field-->
<div class="field" data-testid={testId} use:tooltipAction={tooltip}>
```

- [ ] **Step 2: Add `testId` to `CheckDialogSummary.svelte`**

Add to the typedef (after `tooltip`):

```javascript
    * @property {string} [testId] The stable `data-testid` applied to the value tag.
```

Change the destructure:

```javascript
   /** @type {CheckDialogSummaryProps} */
   const {
      label = undefined,
      value = undefined,
      tooltip = undefined,
      testId = undefined,
   } = $props();
```

Change the value tag (the node whose text the test reads):

```svelte
   <!--Value-->
   <div class="value">
      <div class="tag" data-testid={testId}>
         {value}
      </div>
   </div>
```

- [ ] **Step 3: Pass `testId` to the buttons in `CheckDialogBase.svelte`**

Change the buttons block so each `Button` gets a stable id (the `Button` component already supports `testId`):

```svelte
   <!--Buttons-->
   <div class="row">
      <div class="button">
         <Button onclick={onRoll} testId={'check-dialog-roll'}><Text text="roll"/></Button>
      </div>

      <div class="button">
         <Button onclick={onCancel} testId={'check-dialog-cancel'}><Text text="cancel"/></Button>
      </div>
   </div>
```

- [ ] **Step 4: Build to verify the source compiles**

Run: `npm run build`
Expected: build completes with no Svelte/Vite errors; `index.js` regenerated in repo root.

- [ ] **Step 5: Commit**

```bash
git add src/check/dialog/CheckDialogField.svelte src/check/dialog/CheckDialogSummary.svelte src/check/dialog/CheckDialogBase.svelte
git commit -m "feat(check-dialog): add testId hooks to shared dialog wrappers"
```

---

## Task 2: testId on the 18 concrete field/summary components

For each file below, add the listed `testId` prop as a new attribute on its `<CheckDialogField ...>` (or `<CheckDialogSummary ...>`) element. The prop is a static string literal: `testId={'<value>'}`. Place it directly under the opening tag (alongside `label`, `bind:value`, etc.). Do not change anything else.

**Worked example** — `src/check/dialog/CheckDialogDiceModField.svelte` becomes:

```svelte
<CheckDialogField
   bind:value={$checkOptions.diceMod}
   input={IntegerInput}
   label={'diceMod'}
   testId={'check-field-diceMod'}
   tooltip={'check.diceMod.desc'}
/>
```

**Files and testId values:**

| File | Element | `testId` value |
|---|---|---|
| `src/check/dialog/CheckDialogAttributeField.svelte` | CheckDialogField | `check-field-attribute` |
| `src/check/dialog/CheckDialogSkillField.svelte` | CheckDialogField | `check-field-skill` |
| `src/check/dialog/CheckDialogComplexityField.svelte` | CheckDialogField | `check-field-complexity` |
| `src/check/dialog/CheckDialogDifficultyField.svelte` | CheckDialogField | `check-field-difficulty` |
| `src/check/dialog/CheckDialogDiceModField.svelte` | CheckDialogField | `check-field-diceMod` |
| `src/check/dialog/CheckDialogTrainingModField.svelte` | CheckDialogField | `check-field-trainingMod` |
| `src/check/dialog/CheckDialogExpertiseModField.svelte` | CheckDialogField | `check-field-expertiseMod` |
| `src/check/dialog/CheckDialogDoubleTrainingField.svelte` | CheckDialogField | `check-field-doubleTraining` |
| `src/check/dialog/CheckDialogDoubleExpertiseField.svelte` | CheckDialogField | `check-field-doubleExpertise` |
| `src/check/dialog/CheckDialogDamageModField.svelte` | CheckDialogField | `check-field-damageMod` |
| `src/check/dialog/CheckDialogHealingModField.svelte` | CheckDialogField | `check-field-healingMod` |
| `src/check/dialog/CheckDialogTotalDiceSummary.svelte` | CheckDialogSummary | `check-summary-totalDice` |
| `src/check/dialog/CheckDialogTotalExpertiseSummary.svelte` | CheckDialogSummary | `check-summary-totalExpertise` |
| `src/check/types/attack-check/dialog/AttackCheckDialogTargetDefenseField.svelte` | CheckDialogField | `check-field-targetDefense` |
| `src/check/types/attack-check/dialog/AttackCheckDialogAttackTypeField.svelte` | CheckDialogField | `check-field-type` |
| `src/check/types/attack-check/dialog/AttackCheckDialogAttackerMeleeField.svelte` | CheckDialogField | `check-field-attackerMelee` |
| `src/check/types/attack-check/dialog/AttackCheckDialogAttackerAccuracyField.svelte` | CheckDialogField | `check-field-attackerAccuracy` |
| `src/check/types/resistance-check/dialog/ResistanceCheckDialogResistanceField.svelte` | CheckDialogField | `check-field-resistance` |

- [ ] **Step 1:** Edit all 18 files per the table.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds, no errors.

- [ ] **Step 3: Sanity-grep the testIds landed**

Run: `git grep -c "testId={'check-" -- src/check`
Expected: 18 matching lines across the listed files (plus the 2 buttons in Task 1's base = the base file shows 2). Confirm no file was missed.

- [ ] **Step 4: Commit**

```bash
git add src/check/dialog src/check/types
git commit -m "feat(check-dialog): add testId keys to all dialog field/summary components"
```

---

## Task 3: Build + render sanity check

Confirm the testIds actually render on a live dialog and the existing dialog smoke test still passes.

**Files:** none (verification only).

- [ ] **Step 1: Ensure the live build is current**

Run: `npm run build`
Expected: success.

- [ ] **Step 2: Run the existing dialog smoke spec (regression)**

Run: `npx playwright test tests/e2e/interaction-dialogs.spec.js --reporter=list`
Expected: all tests pass (Foundry on `:30000`, or the Playwright `webServer` launches it). This confirms the testId edits did not break dialog rendering.

- [ ] **Step 3: No commit** (verification only).

---

## Task 4: Create the dialog helper `tests/e2e/checkDialog.js`

**Files:**
- Create: `tests/e2e/checkDialog.js`

- [ ] **Step 1: Write the helper**

```javascript
import { expect } from '@playwright/test';

/**
 * Page-object helpers for driving the rendered Svelte check-option dialogs from Playwright.
 *
 * Each `request<Type>Check` opens its dialog when the `titan.getCheckOptions` setting is on (and no
 * modifier key inverts it — headless Playwright never holds one). Every dialog extends `TitanDialog`
 * (ApplicationV2) so its window root is `.application.titan-dialog`, with a per-type class added by
 * `_getDialogClasses`. Option inputs are native widgets: `NumberInput` renders `<input type="number">`
 * and commits on keyup; `Select` renders a native `<select>`; `CheckboxInput` renders a toggle
 * `<button>` whose checked state is the presence of an `i.fa-check`. Totals render as text inside a
 * `.tag` carrying a `check-summary-*` test id.
 */

/**
 * Per-type dialog metadata: the per-type window selector and the stringified request invocation that
 * opens the dialog from the E2E Roller actor. `fixtures` is resolved in {@link openCheckDialog}.
 * @type {Record<string, { selector: string, request: string }>}
 */
const DIALOG_META = {
   attribute: {
      selector: '.application.titan-attribute-check-dialog',
      request: 'await actor.system.requestAttributeCheck({ attribute: "body" });',
   },
   resistance: {
      selector: '.application.titan-resistance-check-dialog',
      request: 'await actor.system.requestResistanceCheck({ resistance: "resilience" });',
   },
   attack: {
      selector: '.application.titan-attack-check-dialog',
      request: 'await actor.system.requestAttackCheck({ itemId: fixtures.weaponId, attackIdx: 0 });',
   },
   casting: {
      selector: '.application.titan-casting-check-dialog',
      request: 'await actor.system.requestCastingCheck({ itemId: fixtures.spellId });',
   },
   item: {
      selector: '.application.titan-item-check-dialog',
      request: 'await actor.system.requestItemCheck({ itemId: fixtures.abilityId, checkIdx: 0 });',
   },
};

/**
 * Enables the check-options setting and opens the dialog for the given check type from the E2E Roller.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @param {('attribute'|'resistance'|'attack'|'casting'|'item')} type - The check type to open.
 * @returns {Promise<import('@playwright/test').Locator>} A locator for the visible dialog root.
 */
export async function openCheckDialog(page, type) {
   // The per-type selector + request invocation for the requested check type.
   const meta = DIALOG_META[type];

   // Turn the dialog gate on, resolve the roller's owned-item ids, and fire the gated request.
   await page.evaluate(async (requestSrc) => {
      await game.settings.set('titan', 'getCheckOptions', true);
      const actor = game.actors.getName('E2E Roller');
      const fixtures = {
         weaponId: actor.items.find((i) => i.type === 'weapon')?.id,
         spellId: actor.items.find((i) => i.type === 'spell')?.id,
         abilityId: actor.items.find((i) => i.type === 'ability')?.id,
      };
      await new Function('actor', 'fixtures', `return (async () => { ${requestSrc} })();`)(actor, fixtures);
      await new Promise((resolve) => {
         setTimeout(resolve, 400);
      });
   }, meta.request);

   // The dialog window root; assert it mounted before returning.
   const dialog = page.locator(meta.selector).first();
   await expect(dialog).toBeVisible();
   return dialog;
}

/**
 * Sets a numeric option field and triggers the keyup that commits `NumberInput`'s value.
 * @param {import('@playwright/test').Locator} dialog - The dialog root locator.
 * @param {string} key - The option key (testId is `check-field-<key>`).
 * @param {number} value - The numeric value to enter.
 * @returns {Promise<void>} Resolves once the value is committed.
 */
export async function setNumberField(dialog, key, value) {
   // The native number input inside the field wrapper.
   const input = dialog.getByTestId(`check-field-${key}`).locator('input');
   await input.fill(String(value));

   // NumberInput commits in its keyup handler; `.fill()` updates the bound string but does not key up.
   await input.dispatchEvent('keyup', { key: 'End' });
}

/**
 * Selects an option in a native `<select>` field by its visible label.
 * @param {import('@playwright/test').Locator} dialog - The dialog root locator.
 * @param {string} key - The option key (testId is `check-field-<key>`).
 * @param {string|number} label - The visible option label to select.
 * @returns {Promise<void>} Resolves once the option is selected.
 */
export async function setSelectField(dialog, key, label) {
   const select = dialog.getByTestId(`check-field-${key}`).locator('select');
   await select.selectOption({ label: String(label) });
}

/**
 * Sets a checkbox option (a toggle `<button>`) to the desired checked state.
 * @param {import('@playwright/test').Locator} dialog - The dialog root locator.
 * @param {string} key - The option key (testId is `check-field-<key>`).
 * @param {boolean} desired - The desired checked state.
 * @returns {Promise<void>} Resolves once the checkbox matches the desired state.
 */
export async function setCheckbox(dialog, key, desired) {
   // The field wrapper; checked state is the presence of the check icon.
   const field = dialog.getByTestId(`check-field-${key}`);
   const checked = (await field.locator('i.fa-check').count()) > 0;
   if (checked !== desired) {
      await field.locator('button').click();
   }
}

/**
 * Reads a numeric total from a summary tag.
 * @param {import('@playwright/test').Locator} dialog - The dialog root locator.
 * @param {string} key - The summary key (testId is `check-summary-<key>`).
 * @returns {Promise<number>} The parsed numeric value.
 */
export async function readSummary(dialog, key) {
   const text = await dialog.getByTestId(`check-summary-${key}`).innerText();
   return Number(text.trim());
}

/**
 * Clicks the dialog's Roll button (which rolls the check and closes the dialog).
 * @param {import('@playwright/test').Locator} dialog - The dialog root locator.
 * @returns {Promise<void>} Resolves once the click is dispatched.
 */
export async function clickRoll(dialog) {
   await dialog.getByTestId('check-dialog-roll').click();
}

/**
 * Reads the `flags.titan` payload of the most-recently-created chat message, after a settle delay.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @returns {Promise<{ type: string, parameters: object, results: object }>} The newest message flags.
 */
export async function readNewestCheckFlags(page) {
   return await page.evaluate(async () => {
      await new Promise((resolve) => {
         setTimeout(resolve, 300);
      });
      const newest = game.messages.contents[game.messages.size - 1];
      return {
         type: newest?.flags?.titan?.type,
         parameters: newest?.flags?.titan?.parameters,
         results: newest?.flags?.titan?.results,
      };
   });
}
```

- [ ] **Step 2: Lint-parse the helper (syntax check)**

Run: `node --check tests/e2e/checkDialog.js`
Expected: no output (exit 0). It exercised no Playwright runtime, only parse.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/checkDialog.js
git commit -m "test(check): add Playwright dialog page-object helper"
```

---

## Task 5: Create the spec `tests/e2e/checks-dialog.spec.js`

**Files:**
- Create: `tests/e2e/checks-dialog.spec.js`

This spec has three parts: (a) a data-driven **core** test across all five types (mutate `diceMod`/`expertiseMod`/`doubleExpertise`, assert recomputed totals, reset expertise to zero, Roll, verify via the oracle); (b) an **attribute** extra exercising the numeric `<select>` (difficulty) path; (c) an **attack** extra proving `targetDefense` flows into the rolled parameters.

**Key facts baked into the expectations (verified against source):**
- The untrained roller has baseline `totalExpertise === 0` for every type, so `expertiseMod = 3 ⇒ totalExpertise 3`, then `doubleExpertise ⇒ 6`.
- Baseline `totalDice`: attribute/attack/casting/item = 3, resistance = 1. The test reads the baseline live and asserts `baseline + 2` after `diceMod = 2`, so it does not hardcode the baseline.
- Rolling at `expertiseMod = 0` / `doubleExpertise off` keeps `totalExpertise === 0`, so each die's `final` equals its `base` and `expectedCheckResults` (which assumes zero expertise) is valid.
- Attack difficulty = `clamp(targetDefense − attackerRating + 4, 2, 6)`; `targetDefense = 10` drives it to the `6` ceiling, and the raw `targetDefense` param is the direct flow-through proof.

- [ ] **Step 1: Write the spec**

```javascript
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { forceDice, resetDice } from './dice.js';
import { buildE2ERollerActorData, buildE2ERollerItemData } from '../shared/builders.js';
import { expectedCheckResults } from '../shared/checkOracle.js';
import {
   clickRoll,
   openCheckDialog,
   readNewestCheckFlags,
   readSummary,
   setCheckbox,
   setNumberField,
   setSelectField,
} from './checkDialog.js';

/**
 * 2b-3 checks-dialog: drive the rendered Svelte check-option dialog for all five check types. For
 * each, mutate option inputs and assert the displayed totals recompute, then Roll and assert the
 * produced chat message via the same independent oracle the 2b-2 bypass-API tests use. This proves the
 * dialog path (which the `roll<Type>Check` APIs skip) assembles, recomputes, and hands off correctly.
 */

// Forced faces; six entries cover the largest dice count in this spec (baseline 3 + diceMod 2 = 5).
const FORCED_FACES = [6, 5, 4, 3, 2, 1];

// The check types exercised by the uniform core test and their expected `flags.titan.type`.
const CORE_CASES = [
   { type: 'attribute', expectedType: 'attributeCheck' },
   { type: 'resistance', expectedType: 'resistanceCheck' },
   { type: 'attack', expectedType: 'attackCheck' },
   { type: 'casting', expectedType: 'castingCheck' },
   { type: 'item', expectedType: 'itemCheck' },
];

test.describe('v14 checks dialog (driven from Playwright)', () => {
   // Log in and (re)build the E2E Roller fixture before each test.
   test.beforeEach(async ({ page }) => {
      await login(page);

      // Precondition: the TITAN system must have initialized.
      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(systemReady, 'TITAN system failed to initialize before checks-dialog walk').toBe(true);

      // Rebuild the roller from the shared builder payloads for a clean, known fixture each run.
      await page.evaluate(async ({ actorData, itemData }) => {
         const stale = game.actors.getName('E2E Roller');
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create(actorData);
         await actor.createEmbeddedDocuments('Item', itemData);
      }, { actorData: buildE2ERollerActorData(), itemData: buildE2ERollerItemData() });
   });

   // Restore the RNG, the dialog-gate setting, and close any leftover dialog windows after each test.
   test.afterEach(async ({ page }) => {
      await resetDice(page);
      await page.evaluate(async () => {
         await game.settings.set('titan', 'getCheckOptions', false);
         const instances = foundry.applications?.instances;
         if (instances) {
            for (const app of instances.values()) {
               if (app?.element?.classList?.contains('titan-dialog')) {
                  await app.close();
               }
            }
         }
      });
   });

   for (const checkCase of CORE_CASES) {
      test(`${checkCase.type} dialog recomputes totals and rolls with mutated options`, async ({ page }) => {
         // Capture uncaught errors during the dialog + roll window.
         const errors = [];
         page.on('pageerror', (err) => {
            errors.push(err.message);
         });

         const dialog = await openCheckDialog(page, checkCase.type);

         // Baseline totals straight from the freshly opened dialog.
         const baseDice = await readSummary(dialog, 'totalDice');
         const baseExpertise = await readSummary(dialog, 'totalExpertise');
         expect(baseExpertise, 'baseline expertise is zero (untrained roller)').toBe(0);

         // (1) diceMod recompute: +2 dice.
         await setNumberField(dialog, 'diceMod', 2);
         await expect(dialog.getByTestId('check-summary-totalDice')).toHaveText(String(baseDice + 2));

         // (2) expertiseMod recompute: +3 expertise.
         await setNumberField(dialog, 'expertiseMod', 3);
         await expect(dialog.getByTestId('check-summary-totalExpertise')).toHaveText(String(baseExpertise + 3));

         // (3) doubleExpertise recompute: the displayed total doubles.
         await setCheckbox(dialog, 'doubleExpertise', true);
         await expect(dialog.getByTestId('check-summary-totalExpertise'))
            .toHaveText(String((baseExpertise + 3) * 2));

         // Reset expertise to zero so the rolled check satisfies the oracle's zero-expertise assumption.
         await setCheckbox(dialog, 'doubleExpertise', false);
         await setNumberField(dialog, 'expertiseMod', 0);
         await expect(dialog.getByTestId('check-summary-totalExpertise')).toHaveText('0');

         // diceMod stays at 2 → the rolled check should use baseDice + 2 dice.
         const rolledDice = baseDice + 2;
         await expect(dialog.getByTestId('check-summary-totalDice')).toHaveText(String(rolledDice));

         // (4) Roll handoff: force dice, roll, then read the produced message.
         await forceDice(page, FORCED_FACES);
         await clickRoll(dialog);
         const flags = await readNewestCheckFlags(page);

         // The right check type was produced.
         expect(flags.type, 'flags.titan.type').toBe(checkCase.expectedType);

         // The mutated options plumbed through: dice count reflects the dialog diceMod, expertise is zero.
         expect(flags.parameters.totalDice, 'rolled totalDice reflects dialog diceMod').toBe(rolledDice);
         expect(flags.parameters.totalExpertise, 'rolled totalExpertise is zero after reset').toBe(0);

         // Forced faces plumbed into the dice (sorted desc, truncated to the dice rolled).
         const consumedFaces = FORCED_FACES.slice(0, rolledDice).slice().sort((a, b) => b - a);
         expect(flags.results.dice.map((die) => die.base), 'rolled dice bases match forced faces')
            .toEqual(consumedFaces);
         expect(flags.results.dice.map((die) => die.final), 'finals equal bases at zero expertise')
            .toEqual(consumedFaces);

         // Results equal the independent oracle, exactly.
         const expected = expectedCheckResults(consumedFaces, {
            difficulty: flags.parameters.difficulty,
            complexity: flags.parameters.complexity,
            extraSuccessOnCritical: flags.parameters.extraSuccessOnCritical,
            extraFailureOnCritical: flags.parameters.extraFailureOnCritical,
         });
         expect(flags.results.successes, 'successes').toBe(expected.successes);
         expect(flags.results.criticalSuccesses, 'criticalSuccesses').toBe(expected.criticalSuccesses);
         expect(flags.results.criticalFailures, 'criticalFailures').toBe(expected.criticalFailures);
         expect(flags.results.succeeded, 'succeeded').toBe(expected.succeeded);
         expect(flags.results.extraSuccesses, 'extraSuccesses').toBe(expected.extraSuccesses);

         expect(errors, `uncaught errors during ${checkCase.type} dialog roll:\n${errors.join('\n')}`)
            .toEqual([]);
      });
   }

   // Attribute extra: the difficulty `<select>` changes the rolled difficulty without changing dice count.
   test('attribute dialog difficulty select flows through without changing dice', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => {
         errors.push(err.message);
      });

      const dialog = await openCheckDialog(page, 'attribute');
      const baseDice = await readSummary(dialog, 'totalDice');

      // Difficulty is a 1-6 native select; changing it must not change the dice count.
      await setSelectField(dialog, 'difficulty', 6);
      await expect(dialog.getByTestId('check-summary-totalDice')).toHaveText(String(baseDice));

      // It must flow into the rolled difficulty.
      await forceDice(page, FORCED_FACES);
      await clickRoll(dialog);
      const flags = await readNewestCheckFlags(page);
      expect(flags.type, 'flags.titan.type').toBe('attributeCheck');
      expect(flags.parameters.difficulty, 'dialog difficulty select flows into rolled params').toBe(6);

      expect(errors, `uncaught errors during attribute difficulty test:\n${errors.join('\n')}`).toEqual([]);
   });

   // Attack extra: targetDefense set in the dialog flows into the rolled parameters and drives difficulty.
   test('attack dialog targetDefense flows into rolled parameters', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => {
         errors.push(err.message);
      });

      const dialog = await openCheckDialog(page, 'attack');

      // A high targetDefense drives difficulty to its clamp ceiling (6); the raw value flows through.
      await setNumberField(dialog, 'targetDefense', 10);
      await forceDice(page, FORCED_FACES);
      await clickRoll(dialog);
      const flags = await readNewestCheckFlags(page);

      expect(flags.type, 'flags.titan.type').toBe('attackCheck');
      expect(flags.parameters.targetDefense, 'dialog targetDefense flows into rolled params').toBe(10);
      expect(flags.parameters.difficulty, 'high targetDefense clamps difficulty to the ceiling').toBe(6);

      expect(errors, `uncaught errors during attack targetDefense test:\n${errors.join('\n')}`).toEqual([]);
   });
});
```

- [ ] **Step 2: Run the spec**

Run: `npx playwright test tests/e2e/checks-dialog.spec.js --reporter=list`
Expected: 7 tests pass (5 core + attribute extra + attack extra). Foundry must be running on `:30000`, or the Playwright `webServer` launches it.

- [ ] **Step 3: If a test fails, triage before "fixing" the assertion**

A failing expectation here may be a **real engine finding** (as in 2b-1/2b-2), not a bad test. Before loosening any assertion: confirm the dialog value actually changed (screenshot / read the field), confirm the recompute fired, and check the value against the source formula. Only adjust an expected number if the source proves the test's expectation wrong; otherwise surface a potential bug. Specific contingencies:
   - **doubleExpertise total** — expected `(baseExpertise + 3) * 2`. If the engine doubles only the skill-expertise component (not `expertiseMod`), the displayed value differs; read the live value and reconcile against `getAttributeCheckParameters` / `getItemCheckParameters` before changing the expectation.
   - **numeric `<select>` round-trip** — if `setSelectField(... 'difficulty', 6)` does not move `flags.parameters.difficulty` to `6`, the Svelte numeric-`bind:value` may need selecting by value rather than label; adjust the helper, not the assertion.
   - **attack clamp** — if `difficulty` is not `6` at `targetDefense = 10`, read `flags.parameters.attackerRating` and recompute `clamp(10 − attackerRating + 4, 2, 6)`; only then adjust.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/checks-dialog.spec.js
git commit -m "test(check): drive all five check-option dialogs end-to-end via Playwright"
```

---

## Task 6: Regression sweep + docs/state updates

**Files:**
- Modify: `docs/superpowers/e2e-suite-status.md`
- Modify: `C:\Users\emper\.claude\projects\C--FoundryVTT-V14-dev-foundryuserdata-Data-systems-titan\memory\e2e-suite-progress.md`
- Modify (if a gap/stale fact surfaced): `.claude/skills/titan-codebase/references/*.md`

- [ ] **Step 1: Unit suite still green**

Run: `npx vitest run`
Expected: 35 passing (no unit changes expected from this slice).

- [ ] **Step 2: E2E regression across the suite**

Run:
```bash
npx playwright test tests/e2e/render-smoke.spec.js tests/e2e/logic tests/e2e/trait-add-custom.spec.js tests/e2e/interaction-rolls.spec.js tests/e2e/interaction-dialogs.spec.js tests/e2e/dice.spec.js tests/e2e/checks-integration.spec.js tests/e2e/checks-dialog.spec.js --reporter=list
```
Expected: all passing. (The testId source edits are additive `data-testid` attributes; nothing else should regress.)

- [ ] **Step 3: Update the status doc**

In `docs/superpowers/e2e-suite-status.md`: move 2b-3 into the **Done** section with a one-paragraph summary (testId hooks on the shared dialog wrappers + 18 components; `tests/e2e/checkDialog.js` page object; `tests/e2e/checks-dialog.spec.js` — 5 core + attribute-select + attack-targetDefense; any engine findings). Set the **Next action** to **2b-4 checks-opposed** (selected target token auto-populating `targetDefense`). Update the "verify current state quickly" command list to include `tests/e2e/checks-dialog.spec.js` and the new passing count.

- [ ] **Step 4: Update the memory file**

In `…/memory/e2e-suite-progress.md`: change the **Next action** to 2b-4 checks-opposed and note 2b-3 done (dialog page object + testId convention extended to dialog fields). Keep the committed status doc as the source of truth.

- [ ] **Step 5: titan-codebase skill self-update (only if warranted)**

Per the skill's self-update protocol: if implementing revealed a durable, general, verified fact not already documented (e.g., the dialog testId convention, or the attack difficulty clamp formula), add a concise entry to the right `references/*.md`. Report what changed in the final message. Do not duplicate existing facts.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/e2e-suite-status.md .claude/skills/titan-codebase
git commit -m "docs: mark 2b-3 checks-dialog done; next 2b-4 checks-opposed"
```

(The memory file lives outside the repo and is saved via the Write tool, not committed.)

---

## Self-review

**Spec coverage** (against `2026-05-31-titan-e2e-checks-dialog-design.md`):
- §1 goal (open → mutate → recompute → Roll → oracle) → Task 5 core test. ✓
- §2 gated entry / selectors / native widgets → Task 4 helper + Task 1/2 testIds. ✓
- §3 testId plumbing (wrappers + naming scheme) → Tasks 1–2. ✓
- §4 helper + spec files → Tasks 4–5. ✓
- §5 fixture-table delta totals assertion → Task 5 steps (1)–(3), relational deltas read live. ✓
- §6 scope boundary (attack via targetDefense direct; token-target → 2b-4) → Task 5 attack extra + Task 6 next-action. ✓
- §7 risks (numeric select, casting conditional rows, keyup commit, per-type ids) → all five ids pinned in Task 4 `DIALOG_META`; numeric-select + keyup handled in helper; casting conditional rows are untouched by the core test so no special handling needed; Task 5 Step 3 lists triage contingencies. ✓
- §9 verify → Task 6. ✓

**Placeholder scan:** none — all code is complete; no TBD/TODO; every testId value enumerated; every expected number derived from source.

**Type/name consistency:** helper exports (`openCheckDialog`, `setNumberField`, `setSelectField`, `setCheckbox`, `readSummary`, `clickRoll`, `readNewestCheckFlags`) match their imports in the spec. testId strings in Task 2 match the helper's `check-field-<key>` / `check-summary-<key>` derivations and the spec's literal `getByTestId('check-summary-totalDice'|'check-summary-totalExpertise'|'check-dialog-roll')`. Button testIds (`check-dialog-roll`/`check-dialog-cancel`) match Task 1 Step 3.

**Note on casting:** the casting dialog conditionally inserts `healingMod`/`damageMod` rows, but the core test only touches `diceMod`/`expertiseMod`/`doubleExpertise` (always present), so casting needs no special handling. Exercising the conditional mod field is deferred (out of this slice).
