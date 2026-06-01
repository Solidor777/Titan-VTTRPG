# Conditions as `condition`-subtype Active Effects — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert TITAN conditions into a native `condition` Active Effect subtype that carries `rulesElement` (seeded from the Spec A operations), route them through `_applyRulesElements`, and retire the hardcoded `_applyConditions`.

**Architecture:** A new `condition` AE subtype (manifest + `ConditionDataModel` + `CONFIG.ActiveEffect.dataModels`) lets `Conditions.js` seed each status entry with `type: 'condition'` and `system.rulesElement`; Foundry's `fromStatusEffect` spreads those into the toggled effect. `CharacterDataModel._applyRulesElements` then processes `condition`-type effects through the same additive + post-additive pipeline as `effect`-type AEs, and `_applyConditions` is deleted.

**Tech Stack:** Foundry VTT v14, Svelte 5 (runes — not needed here), Vitest (unit), Playwright (e2e). `~/` import alias → `src/`.

**Spec:** `docs/superpowers/specs/2026-06-01-conditions-to-rules-elements-design.md`
**Depends on:** Spec A operations (`mulSum`, `setSum`, `'all'`, rounding) — already shipped.
**Delegation:** `.js` work routed to the `titan-svelte-dev` subagent.

---

## File-structure map

**Create:**
- `src/document/types/active-effect/ConditionDataModel.js` — lean AE data model: `RulesElementMixin` + the Foundry-required `changes` field.
- `tests/unit/ConditionDefinitions.test.js` — seed-mapping unit test.
- `tests/e2e/logic/conditions.spec.js` — per-condition derived-stat e2e.

**Modify:**
- `system.json` — add `"condition": {}` to `documentTypes.ActiveEffect`.
- `src/hooks/OnceInit.js` — register `condition` data model; gate the AE sheet to `types: ['effect']`.
- `src/system/Conditions.js` — extract pure `buildConditionDefinitions()`; add `type` + seed `rulesElement`.
- `src/document/types/actor/types/character/CharacterDataModel.js` — gather condition rules elements; add `condition` mod bucket; switch `getConditions()` filter; delete `_applyConditions` + its call site.

---

## Phase 1 — The `condition` subtype

### Task 1: Register the `condition` Active Effect subtype

**Files:**
- Modify: `system.json`
- Create: `src/document/types/active-effect/ConditionDataModel.js`
- Modify: `src/hooks/OnceInit.js`

- [ ] **Step 1: Add the subtype to the manifest**

In `system.json`, find `documentTypes.ActiveEffect` (currently `{ "effect": {} }`) and add a `condition` sibling:

```json
"ActiveEffect": {
   "effect": {},
   "condition": {}
}
```

- [ ] **Step 2: Create the ConditionDataModel**

Create `src/document/types/active-effect/ConditionDataModel.js`:

```js
import TitanDataModel from '~/document/data-model/TitanDataModel.js';
import RulesElementMixin from '~/document/types/item/rules-element/RulesElementMixin.js';
import createSchemaField from '~/helpers/utility-functions/CreateSchemaField.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';
import createIntegerField from '~/helpers/utility-functions/CreateIntegerField.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createDataField from '~/helpers/utility-functions/CreateDataField.js';

/**
 * The typed system data model for Titan condition Active Effects (subtype 'condition').
 * Conditions are system-defined status effects whose mechanical effects are expressed as Rules Elements
 * (supplied by RulesElementMixin) and seeded onto the CONFIG.statusEffects entry. Unlike the 'effect'
 * subtype, conditions carry no duration, checks, or custom traits.
 * @property {TitanActiveEffect} parent - The Active Effect that owns this data model.
 * @extends {TitanDataModel}
 */
export default class ConditionDataModel extends RulesElementMixin(TitanDataModel) {
   /**
    * Defines the data schema for Titan condition Active Effect documents.
    * @override
    * @returns {object} Map of schema field instances keyed by field name, defining the persisted data shape.
    * @protected
    */
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();

      // Changes.
      // Foundry v14 requires every ActiveEffect type data model to define `changes` as an ArrayField whose
      // element is a SchemaField defining a numeric `priority` and string `type`/`phase` (see
      // Game##verifyActiveEffectModels). Conditions never use changes, but the verifier requires the shape.
      schema.changes = createArrayField(createSchemaField({
         key: createStringField(),
         value: createDataField(''),
         mode: createIntegerField(0),
         priority: createIntegerField(0),
         type: createStringField(),
         phase: createStringField(),
      }));

      return schema;
   }
}
```

- [ ] **Step 3: Register the data model and gate the sheet**

In `src/hooks/OnceInit.js`:

Add the import near the other active-effect imports (e.g. after the `TitanActiveEffectDataModel` import):

```js
import ConditionDataModel from '~/document/types/active-effect/ConditionDataModel.js';
```

Change the `CONFIG.ActiveEffect.dataModels` assignment to register the condition model:

```js
   CONFIG.ActiveEffect.dataModels = {
      effect: TitanActiveEffectDataModel,
      condition: ConditionDataModel,
   };
```

Gate the existing AE sheet registration to the `effect` subtype only (find the `DocumentSheetConfig.registerSheet(foundry.documents.ActiveEffect, 'titan', TitanActiveEffectSheet, {...})` call) by adding `types: ['effect']`:

```js
   foundry.applications.apps.DocumentSheetConfig.registerSheet(
      foundry.documents.ActiveEffect, 'titan', TitanActiveEffectSheet, {
         types: ['effect'],
         makeDefault: true,
         label: localize('defaultEffectSheet'),
      },
   );
```

- [ ] **Step 4: Verify build + lint**

Run: `npx eslint src/document/types/active-effect/ConditionDataModel.js src/hooks/OnceInit.js` then `npm run build`
Expected: no errors; build succeeds. (No behavior change yet — conditions are still created as base type until Task 2 seeds `type`.)

- [ ] **Step 5: Commit**

```bash
git add system.json src/document/types/active-effect/ConditionDataModel.js src/hooks/OnceInit.js
git commit -m "feat(conditions): register condition Active Effect subtype"
```

---

## Phase 2 — Seed the conditions

### Task 2: Extract `buildConditionDefinitions()` and seed rules elements

**Files:**
- Modify: `src/system/Conditions.js`
- Test: `tests/unit/ConditionDefinitions.test.js`

> Context: `Conditions.js` currently builds the condition array inline inside `setupConditions()`, then sorts, sets `flags`, and pushes to `CONFIG.statusEffects`. We extract the static definition list into a pure `buildConditionDefinitions()` (no `game`/`localize` access) so it is unit-testable, and add `type: 'condition'` to every entry plus `system.rulesElement` to the six mechanically-active ones. `setupConditions()` keeps doing the localize-sort + flag enrichment + push.

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/ConditionDefinitions.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildConditionDefinitions } from '~/system/Conditions.js';

/**
 * Returns the condition definition with the given id from buildConditionDefinitions().
 * @param {string} id - The condition id.
 * @returns {object} The matching definition.
 */
function def(id) {
   return buildConditionDefinitions().find((condition) => condition.id === id);
}

describe('buildConditionDefinitions', () => {
   it('marks every condition as the condition subtype', () => {
      for (const condition of buildConditionDefinitions()) {
         expect(condition.type, `${condition.id} should be the condition subtype`).toBe('condition');
      }
   });

   it('seeds blinded with -1 to melee, accuracy, and defense ratings', () => {
      expect(def('blinded').system.rulesElement).toEqual([
         { operation: 'flatModifier', selector: 'rating', key: 'melee', value: -1, uuid: 'condition-blinded-melee' },
         { operation: 'flatModifier', selector: 'rating', key: 'accuracy', value: -1, uuid: 'condition-blinded-accuracy' },
         { operation: 'flatModifier', selector: 'rating', key: 'defense', value: -1, uuid: 'condition-blinded-defense' },
      ]);
   });

   it('seeds contaminated with -1 to all attributes and all resistances', () => {
      expect(def('contaminated').system.rulesElement).toEqual([
         { operation: 'flatModifier', selector: 'attribute', key: 'all', value: -1, uuid: 'condition-contaminated-attributes' },
         { operation: 'flatModifier', selector: 'resistance', key: 'all', value: -1, uuid: 'condition-contaminated-resistances' },
      ]);
   });

   it('seeds stunned with -1 defense', () => {
      expect(def('stunned').system.rulesElement).toEqual([
         { operation: 'flatModifier', selector: 'rating', key: 'defense', value: -1, uuid: 'condition-stunned-defense' },
      ]);
   });

   it('seeds prone with halved speed (round up) plus -1 melee/accuracy', () => {
      expect(def('prone').system.rulesElement).toEqual([
         { operation: 'mulSum', selector: 'speed', key: 'all', value: 0.5, rounding: 'up', uuid: 'condition-prone-speed' },
         { operation: 'flatModifier', selector: 'rating', key: 'melee', value: -1, uuid: 'condition-prone-melee' },
         { operation: 'flatModifier', selector: 'rating', key: 'accuracy', value: -1, uuid: 'condition-prone-accuracy' },
      ]);
   });

   it('seeds restrained with -1 melee/accuracy/defense plus speed set to 0', () => {
      expect(def('restrained').system.rulesElement).toEqual([
         { operation: 'flatModifier', selector: 'rating', key: 'melee', value: -1, uuid: 'condition-restrained-melee' },
         { operation: 'flatModifier', selector: 'rating', key: 'accuracy', value: -1, uuid: 'condition-restrained-accuracy' },
         { operation: 'flatModifier', selector: 'rating', key: 'defense', value: -1, uuid: 'condition-restrained-defense' },
         { operation: 'setSum', selector: 'speed', key: 'all', value: 0, mode: 'set', uuid: 'condition-restrained-speed' },
      ]);
   });

   it('seeds sleeping with halved awareness (round up)', () => {
      expect(def('sleeping').system.rulesElement).toEqual([
         { operation: 'mulSum', selector: 'rating', key: 'awareness', value: 0.5, rounding: 'up', uuid: 'condition-sleeping-awareness' },
      ]);
   });

   it('leaves mechanically-inert conditions without rules elements', () => {
      for (const id of ['dead', 'deafened', 'frightened', 'incapacitated', 'unconscious']) {
         expect(def(id).system, `${id} should have no system.rulesElement`).toBeUndefined();
      }
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ConditionDefinitions.test.js`
Expected: FAIL — `buildConditionDefinitions` is not exported.

- [ ] **Step 3: Refactor `Conditions.js` to extract the pure builder and seed rules elements**

Replace the contents of `src/system/Conditions.js` with:

```js
import localize from '~/helpers/utility-functions/Localize.js';
import sortAscending from '~/helpers/utility-functions/SortAscending.js';

/**
 * Builds the static list of TITAN condition definitions for CONFIG.statusEffects. Every condition is the
 * 'condition' Active Effect subtype; the mechanically-active conditions also carry a `system.rulesElement`
 * array expressing their stat effects (applied through the shared rules-element pipeline). This function is
 * pure (no game/localization access) so it can be unit-tested.
 * @returns {object[]} The condition definitions, each with id, name (localization key), img, type, and —
 * for mechanically-active conditions — system.rulesElement.
 */
export function buildConditionDefinitions() {
   return [
      {
         id: 'blinded',
         name: 'LOCAL.blinded.text',
         img: 'icons/svg/blind.svg',
         type: 'condition',
         system: {
            rulesElement: [
               { operation: 'flatModifier', selector: 'rating', key: 'melee', value: -1, uuid: 'condition-blinded-melee' },
               { operation: 'flatModifier', selector: 'rating', key: 'accuracy', value: -1, uuid: 'condition-blinded-accuracy' },
               { operation: 'flatModifier', selector: 'rating', key: 'defense', value: -1, uuid: 'condition-blinded-defense' },
            ],
         },
      },
      {
         id: 'contaminated',
         name: 'LOCAL.contaminated.text',
         img: 'icons/svg/poison.svg',
         type: 'condition',
         system: {
            rulesElement: [
               { operation: 'flatModifier', selector: 'attribute', key: 'all', value: -1, uuid: 'condition-contaminated-attributes' },
               { operation: 'flatModifier', selector: 'resistance', key: 'all', value: -1, uuid: 'condition-contaminated-resistances' },
            ],
         },
      },
      {
         id: 'dead',
         name: 'LOCAL.dead.text',
         img: 'icons/svg/skull.svg',
         type: 'condition',
      },
      {
         id: 'deafened',
         name: 'LOCAL.deafened.text',
         img: 'icons/svg/deaf.svg',
         type: 'condition',
      },
      {
         id: 'frightened',
         name: 'LOCAL.frightened.text',
         img: 'icons/svg/terror.svg',
         type: 'condition',
      },
      {
         id: 'incapacitated',
         name: 'LOCAL.incapacitated.text',
         img: 'icons/svg/paralysis.svg',
         type: 'condition',
      },
      {
         id: 'prone',
         name: 'LOCAL.prone.text',
         img: 'icons/svg/falling.svg',
         type: 'condition',
         system: {
            rulesElement: [
               { operation: 'mulSum', selector: 'speed', key: 'all', value: 0.5, rounding: 'up', uuid: 'condition-prone-speed' },
               { operation: 'flatModifier', selector: 'rating', key: 'melee', value: -1, uuid: 'condition-prone-melee' },
               { operation: 'flatModifier', selector: 'rating', key: 'accuracy', value: -1, uuid: 'condition-prone-accuracy' },
            ],
         },
      },
      {
         id: 'restrained',
         name: 'LOCAL.restrained.text',
         img: 'icons/svg/net.svg',
         type: 'condition',
         system: {
            rulesElement: [
               { operation: 'flatModifier', selector: 'rating', key: 'melee', value: -1, uuid: 'condition-restrained-melee' },
               { operation: 'flatModifier', selector: 'rating', key: 'accuracy', value: -1, uuid: 'condition-restrained-accuracy' },
               { operation: 'flatModifier', selector: 'rating', key: 'defense', value: -1, uuid: 'condition-restrained-defense' },
               { operation: 'setSum', selector: 'speed', key: 'all', value: 0, mode: 'set', uuid: 'condition-restrained-speed' },
            ],
         },
      },
      {
         id: 'stunned',
         name: 'LOCAL.stunned.text',
         img: 'icons/svg/stoned.svg',
         type: 'condition',
         system: {
            rulesElement: [
               { operation: 'flatModifier', selector: 'rating', key: 'defense', value: -1, uuid: 'condition-stunned-defense' },
            ],
         },
      },
      {
         id: 'sleeping',
         name: 'LOCAL.sleeping.text',
         img: 'icons/svg/sleep.svg',
         type: 'condition',
         system: {
            rulesElement: [
               { operation: 'mulSum', selector: 'rating', key: 'awareness', value: 0.5, rounding: 'up', uuid: 'condition-sleeping-awareness' },
            ],
         },
      },
      {
         id: 'unconscious',
         name: 'LOCAL.unconscious.text',
         img: 'icons/svg/unconscious.svg',
         type: 'condition',
      },
   ];
}

/**
 * Sets up the system conditions, registering each as a CONFIG.statusEffects entry with its localized
 * description and visual-active-effects content flag.
 */
export default function setupConditions() {
   // Get the static condition definitions.
   const conditions = buildConditionDefinitions();

   // Sort conditions by localized name.
   conditions.sort((a, b) => sortAscending(localize(a.name), localize(b.name)));

   // For each condition.
   for (const condition of conditions) {

      // Set the description.
      const description = localize(`${condition.id}.desc`);

      // Set the flags for visual active effects.
      condition.flags = {
         titan: {
            description: description,
            type: 'condition',
         },
         'visual-active-effects.data.content': description,
      };
      CONFIG.statusEffects.push(condition);
   }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ConditionDefinitions.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Verify lint + build**

Run: `npx eslint src/system/Conditions.js tests/unit/ConditionDefinitions.test.js` then `npm run build`
Expected: no errors; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/system/Conditions.js tests/unit/ConditionDefinitions.test.js
git commit -m "feat(conditions): seed condition rules elements via pure builder"
```

---

## Phase 3 — Engine cutover

### Task 3: Route conditions through `_applyRulesElements` and retire `_applyConditions`

**Files:**
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js`
- Test: `tests/e2e/logic/conditions.spec.js`

> This task is an **atomic cutover**: it wires the new condition path AND deletes `_applyConditions` in one commit, so conditions are never both hardcoded-applied and rules-element-applied at once.

- [ ] **Step 1: Write the failing e2e spec**

Create `tests/e2e/logic/conditions.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { login } from '../fixtures.js';
import { buildRulesElementAbilityData } from '../../shared/builders.js';

/**
 * Behavioral coverage of condition mechanics, asserted against the live derived-data pipeline. Each test
 * builds a player actor with a "boost" ability that raises the relevant stats well above zero (so a -1 or a
 * halving is observable and not lost to the floor-at-0 clamp), captures the baseline, toggles the condition,
 * then asserts the derived deltas relative to that baseline.
 */
const ACTOR_NAME = 'E2E Condition Actor';

// A boost ability covering every stat the condition tests read: ratings +5, all attributes +4, all
// resistances +4, stride speed +6.
const BOOST_ELEMENTS = [
   { operation: 'flatModifier', selector: 'rating', key: 'melee', value: 5 },
   { operation: 'flatModifier', selector: 'rating', key: 'accuracy', value: 5 },
   { operation: 'flatModifier', selector: 'rating', key: 'defense', value: 5 },
   { operation: 'flatModifier', selector: 'rating', key: 'awareness', value: 5 },
   { operation: 'flatModifier', selector: 'attribute', key: 'all', value: 4 },
   { operation: 'flatModifier', selector: 'resistance', key: 'all', value: 4 },
   { operation: 'flatModifier', selector: 'speed', key: 'stride', value: 6 },
];

test.describe('conditions — derived-stat mechanics', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(ready, 'TITAN system must be initialized').toBe(true);
   });

   test.afterEach(async ({ page }) => {
      await page.evaluate(async (name) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
      }, ACTOR_NAME);
   });

   /**
    * Creates the boosted actor, captures a baseline snapshot, toggles the condition, and returns
    * { baseline, after } snapshots of the full derived stat block. Runs entirely in the browser.
    */
   async function applyCondition(page, statusId) {
      return page.evaluate(async ({ name, abilityData, statusId }) => {
         const stale = game.actors.getName(name);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [abilityData]);
         await new Promise((resolve) => {
            setTimeout(resolve, 100);
         });

         const snapshot = () => ({
            melee: actor.system.rating.melee.value,
            accuracy: actor.system.rating.accuracy.value,
            defense: actor.system.rating.defense.value,
            awareness: actor.system.rating.awareness.value,
            stride: actor.system.speed.stride.value,
            attribute: Object.fromEntries(Object.entries(actor.system.attribute).map(([k, v]) => [k, v.value])),
            resistance: Object.fromEntries(Object.entries(actor.system.resistance).map(([k, v]) => [k, v.value])),
         });

         const baseline = snapshot();
         await actor.toggleStatusEffect(statusId, { active: true });
         await new Promise((resolve) => {
            setTimeout(resolve, 100);
         });
         const after = snapshot();

         return { baseline, after };
      }, { name: ACTOR_NAME, abilityData: buildRulesElementAbilityData('E2E Condition Boost', BOOST_ELEMENTS), statusId });
   }

   test('blinded lowers melee, accuracy, and defense by 1', async ({ page }) => {
      const { baseline, after } = await applyCondition(page, 'blinded');
      expect(after.melee).toBe(baseline.melee - 1);
      expect(after.accuracy).toBe(baseline.accuracy - 1);
      expect(after.defense).toBe(baseline.defense - 1);
   });

   test('contaminated lowers every attribute and resistance by 1', async ({ page }) => {
      const { baseline, after } = await applyCondition(page, 'contaminated');
      for (const key of Object.keys(baseline.attribute)) {
         expect(after.attribute[key], `attribute ${key}`).toBe(baseline.attribute[key] - 1);
      }
      for (const key of Object.keys(baseline.resistance)) {
         expect(after.resistance[key], `resistance ${key}`).toBe(baseline.resistance[key] - 1);
      }
   });

   test('stunned lowers defense by 1', async ({ page }) => {
      const { baseline, after } = await applyCondition(page, 'stunned');
      expect(after.defense).toBe(baseline.defense - 1);
   });

   test('prone halves speed (round up) and lowers melee/accuracy by 1', async ({ page }) => {
      const { baseline, after } = await applyCondition(page, 'prone');
      expect(after.stride).toBe(Math.ceil(baseline.stride / 2));
      expect(after.melee).toBe(baseline.melee - 1);
      expect(after.accuracy).toBe(baseline.accuracy - 1);
   });

   test('restrained sets speed to 0 and lowers melee/accuracy/defense by 1', async ({ page }) => {
      const { baseline, after } = await applyCondition(page, 'restrained');
      expect(after.stride).toBe(0);
      expect(after.melee).toBe(baseline.melee - 1);
      expect(after.accuracy).toBe(baseline.accuracy - 1);
      expect(after.defense).toBe(baseline.defense - 1);
   });

   test('sleeping halves awareness (round up)', async ({ page }) => {
      const { baseline, after } = await applyCondition(page, 'sleeping');
      expect(after.awareness).toBe(Math.ceil(baseline.awareness / 2));
   });

   test('an inert condition (dead) changes no derived stats', async ({ page }) => {
      const { baseline, after } = await applyCondition(page, 'dead');
      expect(after).toEqual(baseline);
   });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `npm run build:e2e` then `npx playwright test tests/e2e/logic/conditions.spec.js`
Expected: FAIL — conditions are seeded as the subtype (Task 2) but `_applyRulesElements` does not yet process them, so toggling produces no stat change.

- [ ] **Step 3: Gather condition rules elements in `_applyRulesElements`**

In `src/document/types/actor/types/character/CharacterDataModel.js`, find the effect-gathering block in `_applyRulesElements`:

```js
      this.parent.effects.forEach((effect) => {
         if (
            effect.type === 'effect' &&
            !effect.disabled &&
            effect.system.rulesElement &&
            effect.system.rulesElement.length > 0
         ) {
            processElements(effect.system.rulesElement, 'effect');
         }
      });
```

Immediately after that `forEach`, add a second pass for conditions:

```js
      // Also process Rules Elements from the actor's condition Active Effects. Conditions are the 'condition'
      // subtype; their rules elements derive stats through the same pipeline as effects, tagged 'condition'.
      this.parent.effects.forEach((effect) => {
         if (
            effect.type === 'condition' &&
            !effect.disabled &&
            effect.system.rulesElement &&
            effect.system.rulesElement.length > 0
         ) {
            processElements(effect.system.rulesElement, 'condition');
         }
      });
```

- [ ] **Step 4: Add the `condition` mod bucket**

In `_resetDynamicMods`, find the `resetMods` helper:

```js
      function resetMods(mods) {
         mods.equipment = 0;
         mods.effect = 0;
         mods.ability = 0;
      }
```

Add the `condition` bucket:

```js
      function resetMods(mods) {
         mods.equipment = 0;
         mods.effect = 0;
         mods.ability = 0;
         mods.condition = 0;
      }
```

- [ ] **Step 5: Switch the `getConditions()` filter**

Find `getConditions()`:

```js
   getConditions() {
      const conditions = this.parent.effects.filter((effect) => effect.flags.titan?.type === 'condition');
      return conditions.length > 0 ? conditions : null;
   }
```

Change the filter to the native subtype:

```js
   getConditions() {
      const conditions = this.parent.effects.filter((effect) => effect.type === 'condition');
      return conditions.length > 0 ? conditions : null;
   }
```

- [ ] **Step 6: Delete `_applyConditions` and its call site**

In `prepareDerivedData`, remove the `this._applyConditions();` line (it sits between `this._applyRulesElements();` and `this._applyArmorAndShields();`).

Then delete the entire `_applyConditions()` method (its JSDoc block plus the method body — the `switch`-based condition math). It is the only caller; nothing else references it.

- [ ] **Step 7: Run the spec to verify it passes**

Run: `npm run build:e2e` then `npx playwright test tests/e2e/logic/conditions.spec.js`
Expected: PASS (7 tests).

- [ ] **Step 8: Confirm no lingering references and lint**

Run: `grep -rn "_applyConditions" src/` (expect NO matches) then `npx eslint src/document/types/actor/types/character/CharacterDataModel.js tests/e2e/logic/conditions.spec.js`
Expected: no `_applyConditions` matches; no eslint errors.

- [ ] **Step 9: Run the rules-element regression suite**

Run: `npx playwright test tests/e2e/logic/rules-elements.spec.js`
Expected: PASS (11) — the new `condition` bucket and gathering pass don't disturb item/effect rules-element math.

- [ ] **Step 10: Commit**

```bash
git add src/document/types/actor/types/character/CharacterDataModel.js tests/e2e/logic/conditions.spec.js
git commit -m "feat(conditions): derive condition mechanics via rules elements; retire _applyConditions"
```

---

## Phase 4 — Verification & knowledge update

### Task 4: Full suite, lint, and skill/TODO reconciliation

**Files:**
- Modify (as needed): `.claude/skills/titan-codebase/references/*.md`
- Modify: `docs/TODO.md`

> Staging discipline: the working tree has pre-existing unrelated changes (`.claude/claude.md`, `packs/effects/*`, deleted `docs/superpowers/BACKLOG.md`). Use targeted `git add` of only the files named in Step 5 — never `git add -A`.

- [ ] **Step 1: Full unit suite**

Run: `npm run test`
Expected: PASS — includes `ConditionDefinitions.test.js` (8 new tests) on top of the existing suite.

- [ ] **Step 2: Full e2e for conditions + rules elements**

Run: `npm run build:e2e` then `npx playwright test tests/e2e/logic/conditions.spec.js tests/e2e/logic/rules-elements.spec.js`
Expected: PASS (7 + 11).

- [ ] **Step 3: Full e2e regression**

Run: `npx playwright test`
Expected: PASS — no regression across the broader suite.

- [ ] **Step 4: Lint/style gates**

Run: `npm run eslint` then `npm run stylelint`
Expected: no new errors in touched files (pre-existing repo-wide warnings are acceptable; report if eslint exits non-zero solely due to them).

- [ ] **Step 5: Reconcile `titan-codebase` skill + TODO**

In `.claude/skills/titan-codebase/references/abstractions.md` (the Active Effects / conditions area), record the durable facts:
- Conditions are now a native `condition` Active Effect subtype (`ConditionDataModel` = `RulesElementMixin` + required `changes`), seeded with `type` + `system.rulesElement` in `Conditions.js` via the pure `buildConditionDefinitions()`; `fromStatusEffect` spreads these into the toggled AE.
- `_applyRulesElements` processes `effect.type === 'condition'` (tagged `condition`, own mod bucket) through the same additive + post-additive pipeline as effects; `_applyConditions` has been removed.
- `getConditions()` filters `effect.type === 'condition'`.
- `TitanActiveEffectSheet` is registered for `types: ['effect']` only.

In `docs/TODO.md`, mark backlog item #1 ("Convert Conditions to rules elements") **COMPLETE** (both Spec A and Spec B shipped), referencing this plan and the Spec B design doc. Note the no-migration decision (legacy applied conditions are inert until re-toggled).

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/titan-codebase docs/TODO.md
git commit -m "docs(conditions): record condition subtype in codebase skill + close backlog #1"
```

---

## Self-review

**Spec coverage:**
- `condition` subtype (manifest + data model + registration) → Task 1.
- Seed `type` + `rulesElement`, pure `buildConditionDefinitions()` + unit test → Task 2.
- Engine gather + `condition` bucket + `getConditions()` filter + delete `_applyConditions` → Task 3.
- Sheet gated to `types: ['effect']` → Task 1 Step 3.
- Per-condition e2e (incl. inert) → Task 3 Step 1.
- Verification + skill/TODO → Task 4.
- Rulebook mapping (blinded/contaminated/stunned/prone/restrained/sleeping) → Task 2 seeds + Task 3 e2e assertions; prone gains the −1 melee/accuracy and sleeping actually fires.
- No-migration non-goal → respected (no migration task).

**Placeholder scan:** No TBD/TODO/"handle edge cases" — every code step shows complete code.

**Type/name consistency:** `ConditionDataModel`, `buildConditionDefinitions`, `setupConditions`, condition ids (`blinded`/`contaminated`/`dead`/`deafened`/`frightened`/`incapacitated`/`prone`/`restrained`/`stunned`/`sleeping`/`unconscious`), rules-element shapes (matching the Spec A factories: `flatModifier`{op,selector,key,value,uuid}, `mulSum`+rounding, `setSum`+mode), the `condition` mod-bucket name, and `effect.type === 'condition'` filter are consistent across tasks and match the unit-test expectations.
