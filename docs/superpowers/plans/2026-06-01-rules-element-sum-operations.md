# Rules-Element Sum Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `mulSum` (multiply-the-total) and `setSum` (set-the-total) rules-element operations, an `'all'` key selector, and `up`/`down` rounding (extended to `mulBase`), so effects and items can express total-dependent stat math — the operations conditions will use in Spec B.

**Architecture:** Pure, unit-tested delta helpers (`roundDirectional`, `computeMulSumDelta`, `computeSetSumDelta`) hold the math. `CharacterDataModel._applyRulesElements` gains a post-additive sub-phase that runs the two new appliers after the additive ones, and an `'all'`-key expansion step that fans one element into one-per-key before bucketing. Factories, sheet UI, and localization follow the existing rules-element patterns. No conditions are touched (Spec B).

**Tech Stack:** Foundry VTT v14, Svelte 5 (runes), Vitest (unit), Playwright (e2e). Source in `src/`; intra-project imports use the `~/` alias.

**Delegation note:** Per project convention, `.js`/`.svelte` edits are routed to the `titan-svelte-dev` subagent with `svelte-5`, `foundry-vtt`, and `foundry-svelte` skills loaded.

**Spec:** `docs/superpowers/specs/2026-06-01-rules-element-sum-operations-design.md`

---

## File-structure map

**Create (pure helpers):**
- `src/helpers/utility-functions/RoundDirectional.js` — `up`/`down` rounding of a number.
- `src/helpers/utility-functions/ComputeMulSumDelta.js` — mulSum corrective delta from a running total.
- `src/helpers/utility-functions/ComputeSetSumDelta.js` — setSum corrective delta from a running total.

**Create (factories):**
- `src/document/types/item/rules-element/MulSum.js`
- `src/document/types/item/rules-element/SetSum.js`

**Create (sheet UI):**
- `src/document/types/item/sheet/rules-element/ItemSheetMulSumSettings.svelte`
- `src/document/types/item/sheet/rules-element/ItemSheetSetSumSettings.svelte`

**Create (unit tests):**
- `tests/unit/RoundDirectional.test.js`
- `tests/unit/ComputeMulSumDelta.test.js`
- `tests/unit/ComputeSetSumDelta.test.js`

**Modify:**
- `src/system/RulesElementOperations.js` — add `mulSum`, `setSum` to the operation list.
- `src/document/types/item/rules-element/MulBase.js` — add `rounding` field.
- `src/document/types/actor/types/character/CharacterDataModel.js` — `_expandAllKeyElements`, `_getSelectorKeys`, bucketing + invocation of the new appliers, `_applyMulSumElements`, `_applySetSumElements`, `rounding` in `_applyMulBaseElements`.
- `src/document/types/item/sheet/rules-element/ItemSheetRulesElementOperationSelect.svelte` — operation-change cases.
- `src/document/types/item/sheet/rules-element/ItemSheetRulesElementSettings.svelte` — settings-dispatcher cases.
- `src/document/types/item/sheet/rules-element/ItemSheetMulBaseSettings.svelte` — fractional value input + rounding select.
- The six key-select pairs (helper + document wrapper) — `allowAll` support.
- `lang/en.json` — labels for `mulSum`, `setSum`, `all`, `up`, `down`, `set`, `min`, `max`.
- `tests/shared/builders.js` — `buildRulesElementAbilityData` generic builder.
- `tests/e2e/logic/rules-elements.spec.js` — behavioral coverage of the new ops.

---

## Phase 1 — Pure delta helpers (TDD with Vitest)

### Task 1: `roundDirectional` helper

**Files:**
- Create: `src/helpers/utility-functions/RoundDirectional.js`
- Test: `tests/unit/RoundDirectional.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import roundDirectional from '~/helpers/utility-functions/RoundDirectional.js';

describe('roundDirectional', () => {
   it('rounds up with ceil when rounding is "up"', () => {
      expect(roundDirectional(2.5, 'up')).toBe(3);
      expect(roundDirectional(-0.5, 'up')).toBe(-0);
   });

   it('rounds down with floor when rounding is "down"', () => {
      expect(roundDirectional(2.5, 'down')).toBe(2);
      expect(roundDirectional(-0.5, 'down')).toBe(-1);
   });

   it('defaults to floor when rounding is missing or unrecognized', () => {
      expect(roundDirectional(2.9, undefined)).toBe(2);
      expect(roundDirectional(2.9, 'sideways')).toBe(2);
   });

   it('leaves integers unchanged in both directions', () => {
      expect(roundDirectional(4, 'up')).toBe(4);
      expect(roundDirectional(4, 'down')).toBe(4);
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/RoundDirectional.test.js`
Expected: FAIL — cannot resolve `RoundDirectional.js`.

- [ ] **Step 3: Write minimal implementation**

```js
/**
 * Rounds a number in an explicit direction. Used by multiplicative rules elements where TITAN always
 * rounds either up or down (never to nearest).
 * @param {number} value - The number to round.
 * @param {string} rounding - The rounding direction: 'up' (ceil) or 'down' (floor). Any other value
 * (including undefined) is treated as 'down'.
 * @returns {number} The rounded number.
 */
export default function roundDirectional(value, rounding) {
   return rounding === 'up' ? Math.ceil(value) : Math.floor(value);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/RoundDirectional.test.js`
Expected: PASS (4 tests). Note `-0` equals `0` under `toBe` per `Object.is`-free numeric comparison; if `-0` causes a mismatch, the test asserts `toBe(-0)` which matches `Math.ceil(-0.5)`.

- [ ] **Step 5: Commit**

```bash
git add src/helpers/utility-functions/RoundDirectional.js tests/unit/RoundDirectional.test.js
git commit -m "feat(rules-element): add roundDirectional up/down helper"
```

---

### Task 2: `computeMulSumDelta` helper

**Files:**
- Create: `src/helpers/utility-functions/ComputeMulSumDelta.js`
- Test: `tests/unit/ComputeMulSumDelta.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import computeMulSumDelta from '~/helpers/utility-functions/ComputeMulSumDelta.js';

describe('computeMulSumDelta', () => {
   it('halves a positive total rounding up, returning the corrective delta', () => {
      // total 5 -> ceil(2.5)=3 -> delta -2.
      expect(computeMulSumDelta(5, 0.5, 'up')).toBe(-2);
   });

   it('halves a positive total rounding down', () => {
      // total 5 -> floor(2.5)=2 -> delta -3.
      expect(computeMulSumDelta(5, 0.5, 'down')).toBe(-3);
   });

   it('is a no-op for an even total regardless of rounding', () => {
      // total 6 -> 3 either way -> delta -3.
      expect(computeMulSumDelta(6, 0.5, 'up')).toBe(-3);
      expect(computeMulSumDelta(6, 0.5, 'down')).toBe(-3);
   });

   it('returns 0 when the total is zero or negative (guard)', () => {
      expect(computeMulSumDelta(0, 0.5, 'up')).toBe(0);
      expect(computeMulSumDelta(-4, 0.5, 'up')).toBe(0);
   });

   it('supports multipliers greater than one', () => {
      // total 3 -> floor(6)=6 -> delta +3.
      expect(computeMulSumDelta(3, 2, 'down')).toBe(3);
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ComputeMulSumDelta.test.js`
Expected: FAIL — cannot resolve `ComputeMulSumDelta.js`.

- [ ] **Step 3: Write minimal implementation**

```js
import roundDirectional from '~/helpers/utility-functions/RoundDirectional.js';

/**
 * Computes the corrective delta a mulSum rules element must add to a stat's mod bucket so the stat's
 * running total is multiplied and rounded. Returns 0 for non-positive totals so an already-zero stat
 * is never pushed negative.
 * @param {number} total - The stat's running total (base value plus all accumulated modifiers).
 * @param {number} value - The fractional multiplier (e.g. 0.5 to halve).
 * @param {string} rounding - The rounding direction applied to the scaled total ('up' or 'down').
 * @returns {number} The delta to add to the stat's mod bucket (newTotal - total), or 0 if total <= 0.
 */
export default function computeMulSumDelta(total, value, rounding) {
   if (total <= 0) {
      return 0;
   }
   const newTotal = roundDirectional(total * value, rounding);

   return newTotal - total;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ComputeMulSumDelta.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/helpers/utility-functions/ComputeMulSumDelta.js tests/unit/ComputeMulSumDelta.test.js
git commit -m "feat(rules-element): add computeMulSumDelta helper"
```

---

### Task 3: `computeSetSumDelta` helper

**Files:**
- Create: `src/helpers/utility-functions/ComputeSetSumDelta.js`
- Test: `tests/unit/ComputeSetSumDelta.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import computeSetSumDelta from '~/helpers/utility-functions/ComputeSetSumDelta.js';

describe('computeSetSumDelta', () => {
   it('set mode forces the total to the value', () => {
      // total 5 -> set 0 -> delta -5.
      expect(computeSetSumDelta(5, 0, 'set')).toBe(-5);
      // total 2 -> set 4 -> delta +2.
      expect(computeSetSumDelta(2, 4, 'set')).toBe(2);
   });

   it('min mode raises the total to a floor but never lowers it', () => {
      expect(computeSetSumDelta(2, 5, 'min')).toBe(3); // raised to 5
      expect(computeSetSumDelta(8, 5, 'min')).toBe(0); // already above floor
   });

   it('max mode caps the total but never raises it', () => {
      expect(computeSetSumDelta(8, 5, 'max')).toBe(-3); // capped to 5
      expect(computeSetSumDelta(2, 5, 'max')).toBe(0); // already below cap
   });

   it('defaults to set mode for an unknown mode', () => {
      expect(computeSetSumDelta(5, 0, undefined)).toBe(-5);
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ComputeSetSumDelta.test.js`
Expected: FAIL — cannot resolve `ComputeSetSumDelta.js`.

- [ ] **Step 3: Write minimal implementation**

```js
/**
 * Computes the corrective delta a setSum rules element must add to a stat's mod bucket so the stat's
 * running total is forced to (set), floored to (min), or capped at (max) the supplied value.
 * @param {number} total - The stat's running total (base value plus all accumulated modifiers).
 * @param {number} value - The target total value.
 * @param {string} mode - 'set' (force exact), 'min' (raise to at least value), or 'max' (cap at value).
 * Any other value is treated as 'set'.
 * @returns {number} The delta to add to the stat's mod bucket (newTotal - total).
 */
export default function computeSetSumDelta(total, value, mode) {
   let newTotal;
   switch (mode) {
      case 'min': {
         newTotal = Math.max(total, value);
         break;
      }
      case 'max': {
         newTotal = Math.min(total, value);
         break;
      }
      default: {
         newTotal = value;
         break;
      }
   }

   return newTotal - total;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ComputeSetSumDelta.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/helpers/utility-functions/ComputeSetSumDelta.js tests/unit/ComputeSetSumDelta.test.js
git commit -m "feat(rules-element): add computeSetSumDelta helper"
```

---

## Phase 2 — Factories & operation list (pure JS)

### Task 4: Add `rounding` to the `mulBase` factory

**Files:**
- Modify: `src/document/types/item/rules-element/MulBase.js`

- [ ] **Step 1: Update the factory and typedef**

Replace the entire file contents with:

```js
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * A Rules Element for multiplying the base value of a Character's stat, rounding the result.
 * @typedef {object} MulBaseElement
 * @property {string} operation - The operation to be performed by the Rules Element (mulBase).
 * @property {string} selector - The type of stat being modified (attribute,
 * rating, training, expertise, resistance, or mod).
 * @property {string} key - The key of the stat being multiplied (body, willpower, etc.).
 * @property {number} value - The value by which to multiply the base (may be fractional).
 * @property {string} rounding - The rounding direction applied to the scaled base ('up' or 'down').
 * @property {string} uuid - Unique identifier for the Rules Element, used to track the element across type changes.
 */

/**
 * Creates a Rules Element for multiplying the base value of a Character's stat.
 * @param {object} [options] - Options for the rules element.
 * @returns {MulBaseElement} The new Rules Element.
 */
export default function createMulBaseElement(options) {
   return {
      operation: 'mulBase',
      selector: 'attribute',
      key: 'body',
      value: 2,
      rounding: 'down',
      uuid: options?.uuid ?? generateUUID(),
   };
}
```

- [ ] **Step 2: Verify lint passes**

Run: `npx eslint src/document/types/item/rules-element/MulBase.js`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/document/types/item/rules-element/MulBase.js
git commit -m "feat(rules-element): add rounding field to mulBase factory"
```

---

### Task 5: `mulSum` factory

**Files:**
- Create: `src/document/types/item/rules-element/MulSum.js`

- [ ] **Step 1: Write the factory**

```js
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * A Rules Element for multiplying the running total (base value plus all accumulated modifiers) of a
 * Character's stat, then rounding the result.
 * @typedef {object} MulSumElement
 * @property {string} operation - The operation performed by the Rules Element (mulSum).
 * @property {string} selector - The type of stat being modified (attribute, rating, resistance,
 * resource, speed, training, expertise, or mod).
 * @property {string} key - The key of the stat being modified (body, stride, etc.), or 'all' for every
 * key under the selector.
 * @property {number} value - The fractional multiplier applied to the running total (0.5 to halve).
 * @property {string} rounding - The rounding direction applied to the scaled total ('up' or 'down').
 * @property {string} uuid - Unique identifier for the Rules Element, used to track it across type changes.
 */

/**
 * Creates a Rules Element for multiplying the running total of a Character's stat.
 * @param {object} [options] - Options for the rules element.
 * @returns {MulSumElement} The new Rules Element.
 */
export default function createMulSumElement(options) {
   return {
      operation: 'mulSum',
      selector: 'speed',
      key: 'stride',
      value: 0.5,
      rounding: 'up',
      uuid: options?.uuid ?? generateUUID(),
   };
}
```

- [ ] **Step 2: Verify lint passes**

Run: `npx eslint src/document/types/item/rules-element/MulSum.js`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/document/types/item/rules-element/MulSum.js
git commit -m "feat(rules-element): add mulSum factory"
```

---

### Task 6: `setSum` factory

**Files:**
- Create: `src/document/types/item/rules-element/SetSum.js`

- [ ] **Step 1: Write the factory**

```js
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * A Rules Element for forcing the running total (base value plus all accumulated modifiers) of a
 * Character's stat to a target value.
 * @typedef {object} SetSumElement
 * @property {string} operation - The operation performed by the Rules Element (setSum).
 * @property {string} selector - The type of stat being modified (attribute, rating, resistance,
 * resource, speed, training, expertise, or mod).
 * @property {string} key - The key of the stat being modified (body, stride, etc.), or 'all' for every
 * key under the selector.
 * @property {number} value - The target total value.
 * @property {string} mode - 'set' (force exact), 'min' (floor), or 'max' (cap).
 * @property {string} uuid - Unique identifier for the Rules Element, used to track it across type changes.
 */

/**
 * Creates a Rules Element for forcing the running total of a Character's stat to a value.
 * @param {object} [options] - Options for the rules element.
 * @returns {SetSumElement} The new Rules Element.
 */
export default function createSetSumElement(options) {
   return {
      operation: 'setSum',
      selector: 'speed',
      key: 'stride',
      value: 0,
      mode: 'set',
      uuid: options?.uuid ?? generateUUID(),
   };
}
```

- [ ] **Step 2: Verify lint passes**

Run: `npx eslint src/document/types/item/rules-element/SetSum.js`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/document/types/item/rules-element/SetSum.js
git commit -m "feat(rules-element): add setSum factory"
```

---

### Task 7: Register the new operations

**Files:**
- Modify: `src/system/RulesElementOperations.js`

- [ ] **Step 1: Add the operations to the list**

Replace the array literal with (keeping the existing entries, adding `mulSum` and `setSum`):

```js
import deepFreeze from '~/helpers/utility-functions/DeepFreeze.js';

/** @type {string[]} List of all system Rules Element operations. */
export const RULES_ELEMENT_OPERATIONS = deepFreeze([
   'flatModifier',
   'mulBase',
   'mulSum',
   'setSum',
   'fastHealing',
   'persistentDamage',
   'turnMessage',
   'rollMessage',
   'conditionalRatingModifier',
   'conditionalCheckModifier',
]);
```

- [ ] **Step 2: Verify lint passes**

Run: `npx eslint src/system/RulesElementOperations.js`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/system/RulesElementOperations.js
git commit -m "feat(rules-element): register mulSum and setSum operations"
```

---

## Phase 3 — Engine (CharacterDataModel) + e2e

> E2E tasks build the system for the e2e harness and run Playwright. Run the build once at the
> start of a task that adds e2e coverage: `npm run build:e2e`. If the Playwright config already
> builds, the explicit build is harmless.

### Task 8: `'all'`-key expansion + flatModifier `'all'` coverage

**Files:**
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js`
- Modify: `tests/shared/builders.js`
- Test: `tests/e2e/logic/rules-elements.spec.js`

- [ ] **Step 1: Add the generic e2e builder**

Append to `tests/shared/builders.js`:

```js
/**
 * Builds an ability item create-payload carrying an arbitrary list of rules elements, each stamped with
 * a deterministic uuid. Abilities apply their rules elements on mere ownership (no equip), so this is
 * the simplest fixture for asserting derived-stat math through the live pipeline.
 * @param {string} name - The ability name.
 * @param {object[]} elements - The rules-element objects (without uuid); a uuid is added per element.
 * @returns {object} An `Item.create` payload of type `ability`.
 */
export function buildRulesElementAbilityData(name, elements) {
   return {
      name: name,
      type: 'ability',
      system: {
         rulesElement: elements.map((element, index) => ({
            ...element,
            uuid: `e2e-re-${index}`,
         })),
      },
   };
}
```

- [ ] **Step 2: Write the failing e2e test**

Append to `tests/e2e/logic/rules-elements.spec.js` (inside a new `describe` after the existing ones), importing `buildRulesElementAbilityData` at the top of the file alongside the existing builder imports:

```js
test.describe('rules elements — all-key selector', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await page.evaluate(async (name) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
      }, ACTOR_NAME);
   });

   test('flatModifier with key "all" shifts every attribute', async ({ page }) => {
      const attributes = await page.evaluate(async ({ name, abilityData }) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [abilityData]);
         await new Promise((resolve) => {
            setTimeout(resolve, 100);
         });
         return {
            body: actor.system.attribute.body.value,
            mind: actor.system.attribute.mind.value,
            soul: actor.system.attribute.soul.value,
         };
      }, {
         name: ACTOR_NAME,
         abilityData: buildRulesElementAbilityData('E2E All +2', [
            { operation: 'flatModifier', selector: 'attribute', key: 'all', value: 2 },
         ]),
      });

      // Base 1 + 2 for every attribute.
      expect(attributes).toEqual({ body: 3, mind: 3, soul: 3 });
   });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run build:e2e` then `npx playwright test tests/e2e/logic/rules-elements.spec.js -g "all"`
Expected: FAIL — only `body` is modified (`mind`/`soul` stay 1) because `'all'` is not yet expanded.

- [ ] **Step 4: Implement expansion in `CharacterDataModel`**

In `src/document/types/actor/types/character/CharacterDataModel.js`, add these two methods immediately before `_applyRulesElements` (around line 696):

```js
   /**
    * Returns the list of stat keys under a rules-element selector, used to expand an 'all'-key element
    * into one element per concrete key.
    * @param {string} selector - The rules-element selector (attribute, rating, speed, etc.).
    * @returns {string[]} The concrete keys under that selector for this Character.
    * @private
    */
   _getSelectorKeys(selector) {
      if (selector === 'training' || selector === 'expertise') {
         return Object.keys(this.skill);
      }

      return this[selector] ? Object.keys(this[selector]) : [];
   }

   /**
    * Expands any rules element whose key is 'all' into one element per concrete key under its selector,
    * leaving every other element untouched. Operates on the gathered element list before bucketing, so
    * 'all' works uniformly for every operation that carries a key.
    * @param {object[]} elements - The gathered rules elements (already tagged with a type).
    * @returns {object[]} A new array with 'all'-key elements expanded.
    * @private
    */
   _expandAllKeyElements(elements) {
      /** @type {object[]} */
      const expanded = [];
      for (const element of elements) {
         if (element.key === 'all') {
            for (const key of this._getSelectorKeys(element.selector)) {
               expanded.push({ ...element, key });
            }
         }
         else {
            expanded.push(element);
         }
      }

      return expanded;
   }
```

Then wire the expansion into `_applyRulesElements`. Locate (around line 778):

```js
      // If there are any elements.
      if (rulesElements.length > 0) {
```

Replace it with:

```js
      // Expand any 'all'-key elements into one element per concrete key under the selector.
      const allElements = this._expandAllKeyElements(rulesElements);

      // If there are any elements.
      if (allElements.length > 0) {
```

And change the bucketing iterator (around line 798) from `rulesElements.forEach((element) => {` to `allElements.forEach((element) => {`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx playwright test tests/e2e/logic/rules-elements.spec.js -g "all"`
Expected: PASS — `{ body: 3, mind: 3, soul: 3 }`.

- [ ] **Step 6: Run the full rules-element e2e file (regression)**

Run: `npx playwright test tests/e2e/logic/rules-elements.spec.js`
Expected: PASS — existing flatModifier/mulBase tests unaffected.

- [ ] **Step 7: Commit**

```bash
git add src/document/types/actor/types/character/CharacterDataModel.js tests/shared/builders.js tests/e2e/logic/rules-elements.spec.js
git commit -m "feat(rules-element): expand 'all'-key elements per selector key"
```

---

### Task 9: `mulSum` applier + e2e

**Files:**
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js`
- Test: `tests/e2e/logic/rules-elements.spec.js`

- [ ] **Step 1: Write the failing e2e test**

Append a new `describe` to `tests/e2e/logic/rules-elements.spec.js`:

```js
test.describe('rules elements — mulSum (multiply total)', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await page.evaluate(async (name) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
      }, ACTOR_NAME);
   });

   test('mulSum halves the post-additive Body total, rounding up', async ({ page }) => {
      const body = await page.evaluate(async ({ name, abilityData }) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [abilityData]);
         await new Promise((resolve) => {
            setTimeout(resolve, 100);
         });
         return actor.system.attribute.body.value;
      }, {
         name: ACTOR_NAME,
         abilityData: buildRulesElementAbilityData('E2E MulSum', [
            { operation: 'flatModifier', selector: 'attribute', key: 'body', value: 4 },
            { operation: 'mulSum', selector: 'attribute', key: 'body', value: 0.5, rounding: 'up' },
         ]),
      });

      // Base 1 + flat 4 = 5; halved rounding up = 3.
      expect(body, 'mulSum should halve the post-additive total of 5 to 3').toBe(3);
   });

   test('stacked mulSum elements compound in order', async ({ page }) => {
      const body = await page.evaluate(async ({ name, abilityData }) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [abilityData]);
         await new Promise((resolve) => {
            setTimeout(resolve, 100);
         });
         return actor.system.attribute.body.value;
      }, {
         name: ACTOR_NAME,
         abilityData: buildRulesElementAbilityData('E2E MulSum Stack', [
            { operation: 'flatModifier', selector: 'attribute', key: 'body', value: 7 },
            { operation: 'mulSum', selector: 'attribute', key: 'body', value: 0.5, rounding: 'up' },
            { operation: 'mulSum', selector: 'attribute', key: 'body', value: 0.5, rounding: 'up' },
         ]),
      });

      // Base 1 + flat 7 = 8; halved = 4; halved again = 2.
      expect(body, 'two mulSum halvings of 8 should compound to 2').toBe(2);
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build:e2e` then `npx playwright test tests/e2e/logic/rules-elements.spec.js -g "mulSum"`
Expected: FAIL — `mulSum` is ignored (Body stays 5 / 8), because there is no applier yet.

- [ ] **Step 3: Add the import**

At the top of `src/document/types/actor/types/character/CharacterDataModel.js`, add to the existing imports:

```js
import computeMulSumDelta from '~/helpers/utility-functions/ComputeMulSumDelta.js';
```

- [ ] **Step 4: Add the bucket array and switch case**

In `_applyRulesElements`, after the `flatModifierElements` array declaration (around line 785) add:

```js
         /** @type {*[]} */
         const mulSumElements = [];
```

In the operation-sorting `switch` (around line 804, after the `flatModifier` case) add:

```js
               case 'mulSum': {
                  mulSumElements.push(element);
                  break;
               }
```

- [ ] **Step 5: Invoke the applier after the additive appliers**

Immediately after `this._applyFlatModifierElements(flatModifierElements);` (around line 843) add:

```js
         this._applyMulSumElements(mulSumElements);
```

- [ ] **Step 6: Implement the applier**

Add this method immediately after `_applyFlatModifierElements` (around line 961):

```js
   /**
    * Applies Mul-Sum Rules Elements to this Character. Each element multiplies the stat's running total
    * (base value plus every accumulated mod bucket) and writes a corrective delta into the source's
    * bucket. Elements on the same stat are processed in order so multiple multiplications compound.
    * Runs after the additive appliers so the total it reads is complete.
    * @param {MulSumElement[]} elements - Array of Mul-Sum Rules Elements to apply.
    * @private
    */
   _applyMulSumElements(elements) {
      if (elements.length > 0) {
         /** @type {object} */
         const mulSum = {};

         // Sort elements by selector.
         const selectors = sortObjectsIntoContainerByKeyValue(elements, 'selector');

         // For each selector.
         for (const [selector, selectorElements] of Object.entries(selectors)) {
            mulSum[selector] = {};

            // Sort elements by key.
            const keys = sortObjectsIntoContainerByKeyValue(selectorElements, 'key');

            // For each key.
            for (const [key, keyElements] of Object.entries(keys)) {
               mulSum[selector][key] = {};

               // Get the stat data and its base.
               const stat = (selector === 'training' || selector === 'expertise') ?
                  this.skill[key][selector] :
                  this[selector][key];
               const baseValue = selector === 'resource' ? stat.maxBase : stat.baseValue;

               // Apply each element in order, recomputing the running total so multiplications compound.
               for (const element of keyElements) {
                  let total = baseValue;
                  for (const mod of Object.values(stat.mod)) {
                     total += mod;
                  }
                  const delta = computeMulSumDelta(total, element.value, element.rounding);
                  stat.mod[element.type] += delta;
                  mulSum[selector][key][element.type] = (mulSum[selector][key][element.type] ?? 0) + delta;
               }
            }
         }

         this.rulesElementsCache.mulSum = mulSum;
      }
      else {
         this.rulesElementsCache.mulSum = false;
      }
   }
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx playwright test tests/e2e/logic/rules-elements.spec.js -g "mulSum"`
Expected: PASS (2 tests) — Body 3, and stacked Body 2.

- [ ] **Step 8: Commit**

```bash
git add src/document/types/actor/types/character/CharacterDataModel.js tests/e2e/logic/rules-elements.spec.js
git commit -m "feat(rules-element): apply mulSum in a post-additive phase"
```

---

### Task 10: `setSum` applier + e2e

**Files:**
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js`
- Test: `tests/e2e/logic/rules-elements.spec.js`

- [ ] **Step 1: Write the failing e2e test**

Append a new `describe` to `tests/e2e/logic/rules-elements.spec.js`:

```js
test.describe('rules elements — setSum (set total)', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await page.evaluate(async (name) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
      }, ACTOR_NAME);
   });

   test('setSum set mode forces the Body total to the value', async ({ page }) => {
      const results = await page.evaluate(async ({ name, zeroData, twoData }) => {
         const read = async (abilityData) => {
            const stale = game.actors.getName(name);
            if (stale) {
               await stale.delete();
            }
            const actor = await Actor.create({ name, type: 'player' });
            await actor.createEmbeddedDocuments('Item', [abilityData]);
            await new Promise((resolve) => {
               setTimeout(resolve, 100);
            });
            const value = actor.system.attribute.body.value;
            await actor.delete();
            return value;
         };
         return { zero: await read(zeroData), two: await read(twoData) };
      }, {
         name: ACTOR_NAME,
         zeroData: buildRulesElementAbilityData('E2E SetSum 0', [
            { operation: 'flatModifier', selector: 'attribute', key: 'body', value: 4 },
            { operation: 'setSum', selector: 'attribute', key: 'body', value: 0, mode: 'set' },
         ]),
         twoData: buildRulesElementAbilityData('E2E SetSum 2', [
            { operation: 'flatModifier', selector: 'attribute', key: 'body', value: 4 },
            { operation: 'setSum', selector: 'attribute', key: 'body', value: 2, mode: 'set' },
         ]),
      });

      // Total was 5 (base 1 + flat 4); set 0 -> 0, set 2 -> 2.
      expect(results).toEqual({ zero: 0, two: 2 });
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build:e2e` then `npx playwright test tests/e2e/logic/rules-elements.spec.js -g "setSum"`
Expected: FAIL — `setSum` is ignored (Body stays 5).

- [ ] **Step 3: Add the import**

Add to the imports of `CharacterDataModel.js`:

```js
import computeSetSumDelta from '~/helpers/utility-functions/ComputeSetSumDelta.js';
```

- [ ] **Step 4: Add the bucket array, switch case, and invocation**

After the `mulSumElements` array declaration add:

```js
         /** @type {*[]} */
         const setSumElements = [];
```

In the operation-sorting `switch`, after the `mulSum` case add:

```js
               case 'setSum': {
                  setSumElements.push(element);
                  break;
               }
```

Immediately after `this._applyMulSumElements(mulSumElements);` add:

```js
         this._applySetSumElements(setSumElements);
```

- [ ] **Step 5: Implement the applier**

Add this method immediately after `_applyMulSumElements`:

```js
   /**
    * Applies Set-Sum Rules Elements to this Character. Each element forces the stat's running total to a
    * target value (set), floors it (min), or caps it (max), writing a corrective delta into the source's
    * bucket. Elements on the same stat are processed in order. Runs after the additive appliers.
    * @param {SetSumElement[]} elements - Array of Set-Sum Rules Elements to apply.
    * @private
    */
   _applySetSumElements(elements) {
      if (elements.length > 0) {
         /** @type {object} */
         const setSum = {};

         // Sort elements by selector.
         const selectors = sortObjectsIntoContainerByKeyValue(elements, 'selector');

         // For each selector.
         for (const [selector, selectorElements] of Object.entries(selectors)) {
            setSum[selector] = {};

            // Sort elements by key.
            const keys = sortObjectsIntoContainerByKeyValue(selectorElements, 'key');

            // For each key.
            for (const [key, keyElements] of Object.entries(keys)) {
               setSum[selector][key] = {};

               // Get the stat data and its base.
               const stat = (selector === 'training' || selector === 'expertise') ?
                  this.skill[key][selector] :
                  this[selector][key];
               const baseValue = selector === 'resource' ? stat.maxBase : stat.baseValue;

               // Apply each element in order, recomputing the running total.
               for (const element of keyElements) {
                  let total = baseValue;
                  for (const mod of Object.values(stat.mod)) {
                     total += mod;
                  }
                  const delta = computeSetSumDelta(total, element.value, element.mode);
                  stat.mod[element.type] += delta;
                  setSum[selector][key][element.type] = (setSum[selector][key][element.type] ?? 0) + delta;
               }
            }
         }

         this.rulesElementsCache.setSum = setSum;
      }
      else {
         this.rulesElementsCache.setSum = false;
      }
   }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx playwright test tests/e2e/logic/rules-elements.spec.js -g "setSum"`
Expected: PASS — `{ zero: 0, two: 2 }`.

- [ ] **Step 7: Commit**

```bash
git add src/document/types/actor/types/character/CharacterDataModel.js tests/e2e/logic/rules-elements.spec.js
git commit -m "feat(rules-element): apply setSum in the post-additive phase"
```

---

### Task 11: `mulBase` rounding in the applier + e2e

**Files:**
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js`
- Test: `tests/e2e/logic/rules-elements.spec.js`

- [ ] **Step 1: Write the failing e2e test**

Append a new `describe` to `tests/e2e/logic/rules-elements.spec.js`:

```js
test.describe('rules elements — mulBase rounding', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await page.evaluate(async (name) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
      }, ACTOR_NAME);
   });

   test('a fractional mulBase rounds its base contribution up or down', async ({ page }) => {
      const results = await page.evaluate(async ({ name, downData, upData }) => {
         const read = async (abilityData) => {
            const stale = game.actors.getName(name);
            if (stale) {
               await stale.delete();
            }
            const actor = await Actor.create({ name, type: 'player' });
            await actor.createEmbeddedDocuments('Item', [abilityData]);
            await new Promise((resolve) => {
               setTimeout(resolve, 100);
            });
            const value = actor.system.attribute.body.value;
            await actor.delete();
            return value;
         };
         return { down: await read(downData), up: await read(upData) };
      }, {
         name: ACTOR_NAME,
         downData: buildRulesElementAbilityData('E2E MulBase Down', [
            { operation: 'mulBase', selector: 'attribute', key: 'body', value: 0.5, rounding: 'down' },
         ]),
         upData: buildRulesElementAbilityData('E2E MulBase Up', [
            { operation: 'mulBase', selector: 'attribute', key: 'body', value: 0.5, rounding: 'up' },
         ]),
      });

      // Body base 1; contribution = round(1 * (0.5 - 1)) = round(-0.5).
      // down -> floor(-0.5) = -1 -> Body 0. up -> ceil(-0.5) = 0 -> Body 1.
      expect(results).toEqual({ down: 0, up: 1 });
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build:e2e` then `npx playwright test tests/e2e/logic/rules-elements.spec.js -g "mulBase rounding"`
Expected: FAIL — current applier adds the raw `-0.5` without rounding, so both Body values are equal (and likely non-integer / clamped), not `{ down: 0, up: 1 }`.

- [ ] **Step 3: Add the import**

Add to the imports of `CharacterDataModel.js`:

```js
import roundDirectional from '~/helpers/utility-functions/RoundDirectional.js';
```

- [ ] **Step 4: Round the mulBase contribution**

In `_applyMulBaseElements`, locate the inner application loop (around line 896):

```js
                  for (const element of typeElements) {
                     modObject[type] += baseValue * (element.value - 1);
                     mulBase[selector][key][type] += element.value;
                  }
```

Replace the body with a rounded contribution:

```js
                  for (const element of typeElements) {
                     modObject[type] += roundDirectional(baseValue * (element.value - 1), element.rounding);
                     mulBase[selector][key][type] += element.value;
                  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx playwright test tests/e2e/logic/rules-elements.spec.js -g "mulBase rounding"`
Expected: PASS — `{ down: 0, up: 1 }`.

- [ ] **Step 6: Run the full rules-element e2e file (regression)**

Run: `npx playwright test tests/e2e/logic/rules-elements.spec.js`
Expected: PASS — existing integer mulBase tests unaffected (integer contributions round to themselves).

- [ ] **Step 7: Commit**

```bash
git add src/document/types/actor/types/character/CharacterDataModel.js tests/e2e/logic/rules-elements.spec.js
git commit -m "feat(rules-element): round mulBase base contribution by direction"
```

---

## Phase 4 — Sheet UI (Svelte — routed to titan-svelte-dev)

> These tasks have no unit harness (Svelte sheet components). Verify each with `npx eslint <file>`,
> `npx stylelint <file>` (for files with a `<style>` block), and `npm run build`. A final e2e
> regression runs in Phase 5.

### Task 12: `allowAll` option on the key selects

**Files (helper selects):**
- Modify: `src/helpers/svelte-components/input/select/AttributeSelect.svelte`
- Modify: `src/helpers/svelte-components/input/select/RatingSelect.svelte`
- Modify: `src/helpers/svelte-components/input/select/ResistanceSelect.svelte`
- Modify: `src/helpers/svelte-components/input/select/ResourceSelect.svelte`
- Modify: `src/helpers/svelte-components/input/select/SpeedSelect.svelte`
- Modify: `src/helpers/svelte-components/input/select/SkillSelect.svelte`

**Files (document wrappers):**
- Modify: `src/document/svelte-components/select/DocumentAttributeSelect.svelte`
- Modify: `src/document/svelte-components/select/DocumentRatingSelect.svelte`
- Modify: `src/document/svelte-components/select/DocumentResistanceSelect.svelte`
- Modify: `src/document/svelte-components/select/DocumentResourceSelect.svelte`
- Modify: `src/document/svelte-components/select/DocumentSpeedSelect.svelte`
- Modify: `src/document/svelte-components/select/DocumentSkillSelect.svelte`

- [ ] **Step 1: Confirm the helper-select shape**

Open `src/helpers/svelte-components/input/select/SpeedSelect.svelte` (already follows the target pattern with `allowNone`). Confirm each other helper select imports a constant (`ATTRIBUTES`, `RATINGS`, `RESISTANCES`, `RESOURCES`, `SKILLS`, `SPEEDS` — exact names found in `src/system/`) and builds an `options` list. The `mod` selector keeps using `DocumentModSelect`; `'all'` is not added there for this spec (no condition needs `mod`-all), so `DocumentModSelect` is left unchanged.

- [ ] **Step 2: Add `allowAll` to each helper select**

For SpeedSelect the file already derives options; add the `allowAll` prop and push `'all'`. The edited `SpeedSelect.svelte` `<script>` becomes:

```svelte
<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import { SPEEDS } from '~/system/Speeds.js';

   /**
    * @typedef {object} SpeedSelectProps
    * @property {string} [value] - The value that this input should modify.
    * @property {boolean} [allowNone] - Whether to allow None as an option.
    * @property {boolean} [allowAll] - Whether to allow All as an option.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {(event: Event) => void} [onchange] - Callback fired when the selected value changes.
    * @property {string} [testId] - Optional stable selector applied as `data-testid` on the root element.
    */

   /** @type {SpeedSelectProps} */
   let {
      value = $bindable(void 0),
      allowNone = false,
      allowAll = false,
      disabled = false,
      tooltip = void 0,
      onchange = void 0,
      testId = void 0,
   } = $props();

   /** @type {string[]} Options for the Select Svelte component, derived to include All / None when allowed. */
   const options = $derived.by(() => {
      const list = structuredClone(SPEEDS);
      if (allowAll) {
         list.unshift('all');
      }
      if (allowNone) {
         list.push('none');
      }
      return list;
   });
</script>
```

Apply the **same** change to each helper select, substituting the constant it imports:

| Helper select            | Imported constant |
| ------------------------ | ----------------- |
| AttributeSelect.svelte   | `ATTRIBUTES`      |
| RatingSelect.svelte      | `RATINGS`         |
| ResistanceSelect.svelte  | `RESISTANCES`     |
| ResourceSelect.svelte    | `RESOURCES`       |
| SkillSelect.svelte       | `SKILLS`          |
| SpeedSelect.svelte       | `SPEEDS`          |

For any helper select that does not already use a `$derived` options list (it assigns `const options = structuredClone(CONST)`), convert it to the `$derived.by` form shown above so `allowAll`/`allowNone` can prepend/append. If a select has no `allowNone` today, add only the `allowAll` prop and the `if (allowAll) { list.unshift('all'); }` block.

- [ ] **Step 3: Thread `allowAll` through each document wrapper**

In each `Document*Select.svelte`, add the `allowAll` prop and forward it. For `DocumentSpeedSelect.svelte` the `<script>` props and markup become:

```svelte
   /** @type {DocumentSpeedSelectProps} */
   let {
      value = $bindable(void 0),
      allowNone = false,
      allowAll = false,
      disabled = false,
      tooltip = void 0,
   } = $props();
```

```svelte
<SpeedSelect
   {allowNone}
   {allowAll}
   bind:value
   disabled={disabled || !document.data?.isOwner}
   onchange={() => refreshSystemDocument(document.data, disabled)}
   {tooltip}
/>
```

Add the `@property {boolean} [allowAll]` line to each wrapper's typedef. Apply the same prop + forward to `DocumentAttributeSelect`, `DocumentRatingSelect`, `DocumentResistanceSelect`, `DocumentResourceSelect`, and `DocumentSkillSelect`, forwarding to their respective helper selects.

- [ ] **Step 4: Add the `all` label**

In `lang/en.json`, add (alphabetically near the existing `a*` keys, mirroring the `"mulBase.text"` entry shape):

```json
      "all.text": "All",
```

- [ ] **Step 5: Verify lint and build**

Run: `npx eslint src/helpers/svelte-components/input/select/ src/document/svelte-components/select/` then `npx stylelint "src/**/*.svelte"` then `npm run build`
Expected: no errors; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/helpers/svelte-components/input/select/ src/document/svelte-components/select/ lang/en.json
git commit -m "feat(rules-element): add 'all' key option to stat selects"
```

---

### Task 13: `mulSum` settings component + wiring

**Files:**
- Create: `src/document/types/item/sheet/rules-element/ItemSheetMulSumSettings.svelte`
- Modify: `src/document/types/item/sheet/rules-element/ItemSheetRulesElementOperationSelect.svelte`
- Modify: `src/document/types/item/sheet/rules-element/ItemSheetRulesElementSettings.svelte`
- Modify: `lang/en.json`

- [ ] **Step 1: Create the settings component**

`ItemSheetMulSumSettings.svelte` mirrors `ItemSheetFlatModifierSettings.svelte` but (a) passes `allowAll` to the key selects, (b) uses `DocumentNumberInput` for the fractional value, and (c) adds a rounding `Select`:

```svelte
<script>
   import { getContext } from 'svelte';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import DocumentSkillSelect from '~/document/svelte-components/select/DocumentSkillSelect.svelte';
   import DocumentNumberInput from '~/document/svelte-components/input/DocumentNumberInput.svelte';
   import DocumentAttributeSelect from '~/document/svelte-components/select/DocumentAttributeSelect.svelte';
   import DocumentRatingSelect from '~/document/svelte-components/select/DocumentRatingSelect.svelte';
   import DocumentResistanceSelect from '~/document/svelte-components/select/DocumentResistanceSelect.svelte';
   import DocumentResourceSelect from '~/document/svelte-components/select/DocumentResourceSelect.svelte';
   import DocumentSpeedSelect from '~/document/svelte-components/select/DocumentSpeedSelect.svelte';
   import assert from '~/helpers/utility-functions/Assert.js';

   /**
    * @typedef {object} ItemSheetMulSumSettingsProps
    * @property {number} [idx] The index of the rules element in the item's rules elements array.
    */

   /** @type {ItemSheetMulSumSettingsProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string[]} Options for selecting the stat the multiplier applies to. */
   const selectorOptions = [
      'attribute',
      'expertise',
      'rating',
      'resistance',
      'resource',
      'speed',
      'training',
   ];

   /** @type {string[]} Options for the rounding direction. */
   const roundingOptions = [
      'up',
      'down',
   ];

   /**
    * Updates the element key to a sensible default when the selector changes, then triggers an update.
    * @returns {void}
    */
   function onSelectorChange() {
      if (assert(document?.isOwner, 'Cannot modify document %s if not owner.', document?.name)) {
         switch (document.data.system.rulesElement[idx].selector) {
            case 'attribute': {
               document.data.system.rulesElement[idx].key = 'body';
               break;
            }
            case 'training':
            case 'expertise': {
               document.data.system.rulesElement[idx].key = 'arcana';
               break;
            }
            case 'rating': {
               document.data.system.rulesElement[idx].key = 'awareness';
               break;
            }
            case 'resistance': {
               document.data.system.rulesElement[idx].key = 'reflexes';
               break;
            }
            case 'resource': {
               document.data.system.rulesElement[idx].key = 'resolve';
               break;
            }
            case 'speed': {
               document.data.system.rulesElement[idx].key = 'stride';
               break;
            }
            default: {
               break;
            }
         }

         document.data.update({ system: structuredClone(document.data.system) });
      }
   }

   /**
    * Returns the appropriate select component for the key, depending on the current selector type.
    * @returns {object | undefined} The select component, or undefined if no case matches.
    */
   function getKeySelect() {
      switch (document.data.system.rulesElement[idx].selector) {
         case 'attribute': {
            return DocumentAttributeSelect;
         }
         case 'training':
         case 'expertise': {
            return DocumentSkillSelect;
         }
         case 'rating': {
            return DocumentRatingSelect;
         }
         case 'resistance': {
            return DocumentResistanceSelect;
         }
         case 'resource': {
            return DocumentResourceSelect;
         }
         case 'speed': {
            return DocumentSpeedSelect;
         }
         default: {
            break;
         }
      }
   }
</script>

<!--Operation settings-->
<div class="settings">

   <!--Selector-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].selector}
         onchange={onSelectorChange}
         options={selectorOptions}
      />
   </div>

   <!--Key-->
   <div class="field select">
      {#if getKeySelect()}
         {@const KeySelect = getKeySelect()}
         <KeySelect
            allowAll
            bind:value={document.data.system.rulesElement[idx].key}
         />
      {/if}
   </div>

   <!--Value-->
   <div class="field number">
      <DocumentNumberInput bind:value={document.data.system.rulesElement[idx].value}/>
   </div>

   <!--Rounding-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].rounding}
         options={roundingOptions}
      />
   </div>
</div>

<style lang="scss">
   .settings {
      @include tag-container;
      @include flex-group-left;

      width: 100%;

      .field {
         @include flex-row;

         &.select {
            @include flex-group-left;
         }

         &.number {
            @include flex-group-center;
         }
      }
   }
</style>
```

> Note: the `mod` selector is intentionally omitted from `selectorOptions` for the sum ops — there
> is no condition or effect use for multiplying a `mod` total, and `DocumentModSelect` has no
> `allowAll`. If a future need arises it is a one-line addition.

- [ ] **Step 2: Wire the operation-change factory**

In `ItemSheetRulesElementOperationSelect.svelte`, add the import and a `case` in `onRulesElementOperationChanged`:

```js
   import createMulSumElement from '~/document/types/item/rules-element/MulSum.js';
```

```js
            case 'mulSum': {
               document.data.system.rulesElement[idx] =
                  createMulSumElement(
                     document.data.system.rulesElement[idx],
                  );
               break;
            }
```

- [ ] **Step 3: Wire the settings dispatcher**

In `ItemSheetRulesElementSettings.svelte`, add the import and a `case` in the `operationSettingsComponent` derived switch:

```js
   import ItemSheetMulSumSettings
      from '~/document/types/item/sheet/rules-element/ItemSheetMulSumSettings.svelte';
```

```js
         case 'mulSum': {
            return ItemSheetMulSumSettings;
         }
```

- [ ] **Step 4: Add labels**

In `lang/en.json`, add (mirroring the `"mulBase.text"` entry placement and shape):

```json
      "mulSum.text": "Mul Sum",
      "up.text": "Round Up",
      "down.text": "Round Down",
```

- [ ] **Step 5: Verify lint, stylelint, build**

Run: `npx eslint src/document/types/item/sheet/rules-element/` then `npx stylelint "src/document/types/item/sheet/rules-element/*.svelte"` then `npm run build`
Expected: no errors; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/document/types/item/sheet/rules-element/ItemSheetMulSumSettings.svelte src/document/types/item/sheet/rules-element/ItemSheetRulesElementOperationSelect.svelte src/document/types/item/sheet/rules-element/ItemSheetRulesElementSettings.svelte lang/en.json
git commit -m "feat(rules-element): add mulSum sheet settings UI"
```

---

### Task 14: `setSum` settings component + wiring

**Files:**
- Create: `src/document/types/item/sheet/rules-element/ItemSheetSetSumSettings.svelte`
- Modify: `src/document/types/item/sheet/rules-element/ItemSheetRulesElementOperationSelect.svelte`
- Modify: `src/document/types/item/sheet/rules-element/ItemSheetRulesElementSettings.svelte`
- Modify: `lang/en.json`

- [ ] **Step 1: Create the settings component**

`ItemSheetSetSumSettings.svelte` is identical to `ItemSheetMulSumSettings.svelte` from Task 13 except: the value uses `DocumentIntegerInput` (the target total is a whole number), and the third field is a `mode` select instead of a rounding select. Full file:

```svelte
<script>
   import { getContext } from 'svelte';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import DocumentSkillSelect from '~/document/svelte-components/select/DocumentSkillSelect.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import DocumentAttributeSelect from '~/document/svelte-components/select/DocumentAttributeSelect.svelte';
   import DocumentRatingSelect from '~/document/svelte-components/select/DocumentRatingSelect.svelte';
   import DocumentResistanceSelect from '~/document/svelte-components/select/DocumentResistanceSelect.svelte';
   import DocumentResourceSelect from '~/document/svelte-components/select/DocumentResourceSelect.svelte';
   import DocumentSpeedSelect from '~/document/svelte-components/select/DocumentSpeedSelect.svelte';
   import assert from '~/helpers/utility-functions/Assert.js';

   /**
    * @typedef {object} ItemSheetSetSumSettingsProps
    * @property {number} [idx] The index of the rules element in the item's rules elements array.
    */

   /** @type {ItemSheetSetSumSettingsProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string[]} Options for selecting the stat the setter applies to. */
   const selectorOptions = [
      'attribute',
      'expertise',
      'rating',
      'resistance',
      'resource',
      'speed',
      'training',
   ];

   /** @type {string[]} Options for the set mode. */
   const modeOptions = [
      'set',
      'min',
      'max',
   ];

   /**
    * Updates the element key to a sensible default when the selector changes, then triggers an update.
    * @returns {void}
    */
   function onSelectorChange() {
      if (assert(document?.isOwner, 'Cannot modify document %s if not owner.', document?.name)) {
         switch (document.data.system.rulesElement[idx].selector) {
            case 'attribute': {
               document.data.system.rulesElement[idx].key = 'body';
               break;
            }
            case 'training':
            case 'expertise': {
               document.data.system.rulesElement[idx].key = 'arcana';
               break;
            }
            case 'rating': {
               document.data.system.rulesElement[idx].key = 'awareness';
               break;
            }
            case 'resistance': {
               document.data.system.rulesElement[idx].key = 'reflexes';
               break;
            }
            case 'resource': {
               document.data.system.rulesElement[idx].key = 'resolve';
               break;
            }
            case 'speed': {
               document.data.system.rulesElement[idx].key = 'stride';
               break;
            }
            default: {
               break;
            }
         }

         document.data.update({ system: structuredClone(document.data.system) });
      }
   }

   /**
    * Returns the appropriate select component for the key, depending on the current selector type.
    * @returns {object | undefined} The select component, or undefined if no case matches.
    */
   function getKeySelect() {
      switch (document.data.system.rulesElement[idx].selector) {
         case 'attribute': {
            return DocumentAttributeSelect;
         }
         case 'training':
         case 'expertise': {
            return DocumentSkillSelect;
         }
         case 'rating': {
            return DocumentRatingSelect;
         }
         case 'resistance': {
            return DocumentResistanceSelect;
         }
         case 'resource': {
            return DocumentResourceSelect;
         }
         case 'speed': {
            return DocumentSpeedSelect;
         }
         default: {
            break;
         }
      }
   }
</script>

<!--Operation settings-->
<div class="settings">

   <!--Selector-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].selector}
         onchange={onSelectorChange}
         options={selectorOptions}
      />
   </div>

   <!--Key-->
   <div class="field select">
      {#if getKeySelect()}
         {@const KeySelect = getKeySelect()}
         <KeySelect
            allowAll
            bind:value={document.data.system.rulesElement[idx].key}
         />
      {/if}
   </div>

   <!--Value-->
   <div class="field number">
      <DocumentIntegerInput bind:value={document.data.system.rulesElement[idx].value}/>
   </div>

   <!--Mode-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].mode}
         options={modeOptions}
      />
   </div>
</div>

<style lang="scss">
   .settings {
      @include tag-container;
      @include flex-group-left;

      width: 100%;

      .field {
         @include flex-row;

         &.select {
            @include flex-group-left;
         }

         &.number {
            @include flex-group-center;
         }
      }
   }
</style>
```

- [ ] **Step 2: Wire the operation-change factory**

In `ItemSheetRulesElementOperationSelect.svelte`, add:

```js
   import createSetSumElement from '~/document/types/item/rules-element/SetSum.js';
```

```js
            case 'setSum': {
               document.data.system.rulesElement[idx] =
                  createSetSumElement(
                     document.data.system.rulesElement[idx],
                  );
               break;
            }
```

- [ ] **Step 3: Wire the settings dispatcher**

In `ItemSheetRulesElementSettings.svelte`, add:

```js
   import ItemSheetSetSumSettings
      from '~/document/types/item/sheet/rules-element/ItemSheetSetSumSettings.svelte';
```

```js
         case 'setSum': {
            return ItemSheetSetSumSettings;
         }
```

- [ ] **Step 4: Add labels**

In `lang/en.json`, add (mirroring existing entry placement/shape):

```json
      "setSum.text": "Set Sum",
      "set.text": "Set",
      "min.text": "Minimum",
      "max.text": "Maximum",
```

- [ ] **Step 5: Verify lint, stylelint, build**

Run: `npx eslint src/document/types/item/sheet/rules-element/` then `npx stylelint "src/document/types/item/sheet/rules-element/*.svelte"` then `npm run build`
Expected: no errors; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/document/types/item/sheet/rules-element/ItemSheetSetSumSettings.svelte src/document/types/item/sheet/rules-element/ItemSheetRulesElementOperationSelect.svelte src/document/types/item/sheet/rules-element/ItemSheetRulesElementSettings.svelte lang/en.json
git commit -m "feat(rules-element): add setSum sheet settings UI"
```

---

### Task 15: `mulBase` settings — fractional value + rounding select

**Files:**
- Modify: `src/document/types/item/sheet/rules-element/ItemSheetMulBaseSettings.svelte`

- [ ] **Step 1: Read the current component**

Open `ItemSheetMulBaseSettings.svelte`. It follows the `ItemSheetFlatModifierSettings.svelte` pattern with a `DocumentIntegerInput` value field and no rounding control.

- [ ] **Step 2: Switch to a fractional value input and add a rounding select**

Change the value input import from `DocumentIntegerInput` to `DocumentNumberInput`:

```js
   import DocumentNumberInput from '~/document/svelte-components/input/DocumentNumberInput.svelte';
```

Add a rounding options array in the `<script>`:

```js
   /** @type {string[]} Options for the rounding direction. */
   const roundingOptions = [
      'up',
      'down',
   ];
```

Replace the value `<DocumentIntegerInput .../>` with `<DocumentNumberInput .../>` (same `bind:value`), and add a rounding field after it:

```svelte
   <!--Value-->
   <div class="field number">
      <DocumentNumberInput bind:value={document.data.system.rulesElement[idx].value}/>
   </div>

   <!--Rounding-->
   <div class="field select">
      <DocumentSelect
         bind:value={document.data.system.rulesElement[idx].rounding}
         options={roundingOptions}
      />
   </div>
```

If `DocumentSelect` is not already imported in this file, add:

```js
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
```

- [ ] **Step 3: Verify lint, stylelint, build**

Run: `npx eslint src/document/types/item/sheet/rules-element/ItemSheetMulBaseSettings.svelte` then `npx stylelint src/document/types/item/sheet/rules-element/ItemSheetMulBaseSettings.svelte` then `npm run build`
Expected: no errors; build succeeds. (`up.text`/`down.text` labels were added in Task 13.)

- [ ] **Step 4: Commit**

```bash
git add src/document/types/item/sheet/rules-element/ItemSheetMulBaseSettings.svelte
git commit -m "feat(rules-element): mulBase UI supports fractional value + rounding"
```

---

## Phase 5 — Full verification & knowledge update

### Task 16: Suite, lint, and skill reconciliation

**Files:**
- Modify (as needed): `.claude/skills/titan-codebase/references/*.md`

- [ ] **Step 1: Run the full unit suite**

Run: `npm run test`
Expected: PASS — includes the three new helper test files; previous unit count was 39, now higher.

- [ ] **Step 2: Run the full rules-element e2e file**

Run: `npm run build:e2e` then `npx playwright test tests/e2e/logic/rules-elements.spec.js`
Expected: PASS — all original plus the new `all` / `mulSum` / `setSum` / `mulBase rounding` describes.

- [ ] **Step 3: Run the full e2e suite (regression)**

Run: `npx playwright test`
Expected: PASS — no regression in the broader suite (was 315 passing).

- [ ] **Step 4: Lint and style gates**

Run: `npm run eslint` then `npm run stylelint`
Expected: no errors.

- [ ] **Step 5: Reconcile the `titan-codebase` skill**

Per the skill's self-update protocol, record the durable facts:
- `references/abstractions.md` (or the rules-element section): the operation set now includes
  `mulSum` (multiply running total) and `setSum` (set/floor/cap running total), both run in a
  post-additive sub-phase of `_applyRulesElements`; `flatModifier`/`mulSum`/`setSum` support a
  `key: 'all'` selector expanded by `_expandAllKeyElements`; `mulBase` and `mulSum` carry an
  `up`/`down` `rounding` field.
- Note the pure delta helpers `RoundDirectional` / `ComputeMulSumDelta` / `ComputeSetSumDelta`.

- [ ] **Step 6: Update `docs/TODO.md`**

Edit backlog item #1 to record that Spec A (sum operations) is complete and that the remaining work
is Spec B (convert status effects to `condition`-subtype `TitanActiveEffect`s carrying rules elements,
seed templates using the new ops, retire `_applyConditions`).

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/titan-codebase docs/TODO.md
git commit -m "docs(rules-element): record sum operations in codebase skill + backlog"
```

---

## Self-review

**Spec coverage:**
- `mulSum` semantics → Tasks 2, 9. `setSum` semantics → Tasks 3, 10. `'all'` selector → Tasks 8, 12.
  `mulBase` rounding → Tasks 4, 11, 15. Post-additive ordering → Task 9 Step 5 (invoked after
  `_applyFlatModifierElements`). Factories/registration → Tasks 4–7. Sheet UI → Tasks 12–15.
  Localization → Tasks 12–14. Testing (unit + e2e) → Tasks 1–3, 8–11, 16. Non-goals preserved
  (no condition changes; no `mulBase` `'all'` in UI; expansion is op-agnostic at engine level but
  UI exposes `'all'` only on flat/mulSum/setSum).
- Gap check: the `mod` selector is excluded from the sum-op UIs by design (documented inline in
  Task 13) — engine still handles it if authored programmatically.

**Placeholder scan:** No TBD/TODO/"handle edge cases" — every code step shows full code.

**Type/name consistency:** `roundDirectional`, `computeMulSumDelta`, `computeSetSumDelta`,
`_expandAllKeyElements`, `_getSelectorKeys`, `_applyMulSumElements`, `_applySetSumElements`,
`createMulSumElement`, `createSetSumElement`, `createMulBaseElement` (now with `rounding`),
`mulSumElements` / `setSumElements`, cache keys `rulesElementsCache.mulSum` / `.setSum`,
field names `value` / `rounding` / `mode` / `key: 'all'` — used consistently across tasks.
