# Follow-up D — Check chat schemas from single-source templates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Route every `.js`/`.svelte` edit through the `titan-svelte-dev` subagent with `svelte-5`, `foundry-vtt`, `foundry-svelte` loaded.

**Goal:** Make each TITAN check's parameter/result field-set a single source shared by the check-engine factories AND the chat-message schemas (typed per subtype via `buildSchemaFromShape`), and faithfully propagate the item/casting check config into the rolled parameters so the opposed/resistance damage-reduction works and stale card reads are fixed.

**Architecture:** Three layers, sequenced correctness-first. (1) Fix `CharacterDataModel.getItemCheckParameters`/`getCastingCheckParameters` so the rolled `parameters` mirror the item config (this finalizes the runtime shapes), and repoint stale Svelte reads. (2) Extract a co-located zero-value "shape" next to each factory and have the factory spread it (byte-identical output). (3) Build the 5 typed per-subtype chat schemas from those shapes and freeze them with a golden-master test.

**Tech Stack:** JavaScript, Foundry v14 DataModel (`foundry.data.fields.*` via `create*Field` helpers), Svelte 5 (runes), Vitest (`vitest run`), Playwright (`playwright test`). Spec: `docs/superpowers/specs/2026-06-04-chat-subtypes-followup-D-check-templates-design.md`.

---

## File structure

**Check engine — parameters/results factories (each gains an exported `*Shape()`; the default-export factory spreads it):**
- `src/check/CheckResults.js` — base `createCheckResultsShape()` + `calculateCheckResults` spreads it.
- `src/check/types/attribute-check/AttributeCheckParameters.js`, `AttributeCheckResults.js`
- `src/check/types/resistance-check/ResistanceCheckParameters.js`, `ResistanceCheckResults.js`
- `src/check/types/attack-check/AttackCheckParameters.js`, `AttackCheckResults.js`
- `src/check/types/casting-check/CastingCheckParameters.js`, `CastingCheckResults.js`
- `src/check/types/item-check/ItemCheckParameters.js`, `ItemCheckResults.js`

**Chat schemas:**
- `src/check/chat-message/CheckChatMessageDataModel.js` — keep `failuresReRolled`/`message`; drop untyped `parameters`/`results`; add `_defineCheckDataSchema(pShape, rShape)` helper.
- `src/check/types/{attribute,resistance,attack,casting,item}-check/chat-message/<T>CheckChatMessageDataModel.js` — each overrides `_defineDocumentSchema()`.

**Correctness (Part 3):**
- `src/document/types/actor/types/character/CharacterDataModel.js` — `getItemCheckParameters` (~3619-3672). (Casting needs NO change here: its only stale read, `itemTrait`, is repointed to `customTrait`, which `getCastingCheckParameters` already propagates at 3193 — unless the propagation audit finds otherwise.)
- `src/check/types/item-check/chat-message/ItemCheckChatMessage.svelte`, `ItemCheckChatItemTraits.svelte`
- `src/check/types/casting-check/chat-message/CastingCheckChatMessage.svelte`

**Tests:**
- `tests/unit/CheckChatMessageSchemaEquivalence.test.js` (new — golden master, mirrors `ItemDataModelSchemaEquivalence.test.js`)
- `tests/unit/check/check-shape-parity.test.js` (new — factory↔shape parity)
- `tests/e2e/item-check-damage-reduction.spec.js` (new — opposed/resistance reduction feed)

---

## Phase 1 — Item/casting correctness (Part 3, gameplay). Establishes the final runtime parameter shapes.

> Do this first so the shapes extracted in Phase 2 and frozen in Phase 3 are already final. This phase changes gameplay (the opposed/resistance damage-reduction goes live) and is gated by a new e2e.

### Task 1: Add the missing config fields to the item-check parameters factory

**Files:**
- Modify: `src/check/types/item-check/ItemCheckParameters.js`

- [ ] **Step 1: Add `isDamage`, `isHealing`, and a typed nested `opposedCheck` default; keep `damageReducedBy: 'none'`.**

In `createItemCheckParameters`, change the returned object so `opposedCheck` is always an object and `isDamage`/`isHealing` exist (insert alphabetically to match the file's ordering):

```js
// ...existing fields...
healingMod: options.healingMod,
img: '',
isDamage: false,
isHealing: false,
itemDescription: '',
itemName: '',
opposedCheck: {
   attribute: '',
   enabled: false,
   skill: '',
},
resistanceCheck: '',
// ...existing fields...
```

Also update the JSDoc typedef: `opposedCheck` is `{OpposedCheckBase}` (`{enabled, attribute, skill}`), and add `{boolean} isDamage` / `{boolean} isHealing`.

- [ ] **Step 2: Run existing check unit tests to confirm nothing broke.**

Run: `npx vitest run tests/unit/check`
Expected: PASS (these test `calculateCheckResults`, unaffected by the added parameter fields).

- [ ] **Step 3: Commit.**

```bash
git add src/check/types/item-check/ItemCheckParameters.js
git commit -m "feat(check): item-check parameters carry isDamage/isHealing + typed opposedCheck"
```

### Task 2: Faithfully propagate item config in `getItemCheckParameters`

**Files:**
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js` (`getItemCheckParameters`, ~3632-3669)

- [ ] **Step 1: Copy `isDamage`/`isHealing`, carry `opposedCheck.enabled`, and fix the `damageReducedBy` gate.**

Replace the opposed-check + damage block. Current:

```js
      // Set the opposed check data.
      if (checkData.opposedCheck.enabled) {
         parameters.opposedCheck = {
            attribute: checkData.opposedCheck.attribute,
            skill: checkData.opposedCheck.skill,
         };
      }

      // If this check has damage or healing.
      if (checkData.isDamage || checkData.isHealing) {

         // Set the base damage if appropriate.
         if (checkData.isDamage) {
            parameters.damage = checkData.initialValue;

            // Set whether the damage can be reduced.
            if ((parameters.damageReducedBy === 'opposedCheck' && parameters.opposedCheck.enabled) ||
               (parameters.damageReducedBy === 'resistanceCheck' && parameters.resistanceCheck !== 'none')) {
               parameters.damageReducedBy = checkData.damageReducedBy;
            }
         }
```

New:

```js
      // Carry the item's damage/healing flags so the chat card can read them.
      parameters.isDamage = checkData.isDamage;
      parameters.isHealing = checkData.isHealing;

      // Set the opposed check data, carrying the enabled flag so the card and damage-reduction read it.
      parameters.opposedCheck = {
         attribute: checkData.opposedCheck.attribute,
         enabled: checkData.opposedCheck.enabled,
         skill: checkData.opposedCheck.skill,
      };

      // If this check has damage or healing.
      if (checkData.isDamage || checkData.isHealing) {

         // Set the base damage if appropriate.
         if (checkData.isDamage) {
            parameters.damage = checkData.initialValue;

            // Carry the item's configured damage-reduction when an opposed or resistance check backs it.
            if ((checkData.damageReducedBy === 'opposedCheck' && checkData.opposedCheck.enabled) ||
               (checkData.damageReducedBy === 'resistanceCheck' && checkData.resistanceCheck !== 'none')) {
               parameters.damageReducedBy = checkData.damageReducedBy;
            }
         }
```

(The rest of the method — healing, scaling, `return parameters` — is unchanged.)

- [ ] **Step 2: Lint the changed file.**

Run: `npx eslint src/document/types/actor/types/character/CharacterDataModel.js`
Expected: no new errors.

- [ ] **Step 3: Commit.**

```bash
git add src/document/types/actor/types/character/CharacterDataModel.js
git commit -m "fix(check): item-check parameters mirror item config (damageReducedBy/isDamage/opposedCheck.enabled)"
```

### Task 3: Repoint stale Svelte reads (`itemTrait` → `customTrait`, opposed guard, drop `difficulty`)

**Files:**
- Modify: `src/check/types/item-check/chat-message/ItemCheckChatItemTraits.svelte`
- Modify: `src/check/types/item-check/chat-message/ItemCheckChatMessage.svelte`
- Modify: `src/check/types/casting-check/chat-message/CastingCheckChatMessage.svelte`

- [ ] **Step 1: `ItemCheckChatItemTraits.svelte` — read `customTrait`.**

Change line 11 `{#each document.data.system.parameters.itemTrait as trait}` → `{#each document.data.system.parameters.customTrait as trait}`.

- [ ] **Step 2: `ItemCheckChatMessage.svelte` — fix the traits guard, the opposed guard, and drop the sourceless `difficulty`.**

- Line 32: `{#if document.data.system.parameters.itemTrait}` → `{#if document.data.system.parameters.customTrait.length}`.
- Line 69: `{#if document.data.system.parameters.opposedCheck}` → `{#if document.data.system.parameters.opposedCheck.enabled}`.
- In the `<ChatAttributeCheckButton>` (lines 71-83), remove the `difficulty={…opposedCheck.difficulty}` prop entirely (no data source; the opposed attribute check uses its default difficulty). Verify `ChatMessageOpposedAttributeCheckButton.svelte` supplies a default when `difficulty` is omitted; if it requires the prop, pass the system default (`4`).

- [ ] **Step 3: `CastingCheckChatMessage.svelte` — read `customTrait`.**

Change line 41 `{#if document.data.system.parameters.itemTrait}` → `{#if document.data.system.parameters.customTrait.length}` and update the child component it guards (mirror Step 1 in that child if it reads `itemTrait`).

- [ ] **Step 4: Audit follow-through.** Grep the casting card's child components for `itemTrait` and repoint any remaining stale reads:

Run: `npx vitest run` is not the check here — instead search: confirm zero `parameters.itemTrait` reads remain.
Expected after edits: `grep -rn "parameters.itemTrait" src` returns nothing.

- [ ] **Step 5: Stylelint the changed Svelte files.**

Run: `npx stylelint "src/check/**/*.svelte"`
Expected: no new errors.

- [ ] **Step 6: Commit.**

```bash
git add src/check/types/item-check/chat-message/ItemCheckChatItemTraits.svelte src/check/types/item-check/chat-message/ItemCheckChatMessage.svelte src/check/types/casting-check/chat-message/CastingCheckChatMessage.svelte
git commit -m "fix(check): repoint stale itemTrait reads to customTrait; opposed guard to .enabled"
```

### Task 4: New e2e — opposed/resistance damage-reduction feed

**Files:**
- Create: `tests/e2e/item-check-damage-reduction.spec.js`
- Test build: e2e specs build via Playwright config; no shipping-bundle impact.

- [ ] **Step 1: Write the failing e2e.** Mirror the structure of an existing check spec (read `tests/e2e/interaction-rolls.spec.js` and any `tests/e2e/checks-*.spec.js` for the shared `page` boot, login, actor/item setup, and `titanWait`/`expect.poll` helpers — do NOT add fixed sleeps). The scenario:

  1. Create an actor and an item with an item-check configured: `isDamage: true`, `initialValue` ≥ 1, `opposedCheck.enabled: true` (with an attribute + skill), and `damageReducedBy: 'opposedCheck'`.
  2. Roll the item check from the actor; wait for the item-check chat card.
  3. Assert the card's opposed-check button is present (the `.enabled` guard) and that the resulting opposed attribute-check chat message receives a non-zero `damageToReduce` (read `flags`/system on the rolled opposed message, or assert the rendered reduced `damageTaken`).
  4. Repeat with a sibling check configured `damageReducedBy: 'resistanceCheck'` and `resistanceCheck !== 'none'`; assert the resistance button feeds a non-zero `damageToReduce`.

- [ ] **Step 2: Run it (requires the world launched at `:30000`).**

Run: `npx playwright test tests/e2e/item-check-damage-reduction.spec.js`
Expected: PASS (with Tasks 1-3 applied). If the world is not launched, ask the user to launch it.

- [ ] **Step 3: Commit.**

```bash
git add tests/e2e/item-check-damage-reduction.spec.js
git commit -m "test(e2e): opposed/resistance item-check damage-reduction feeds through"
```

---

## Phase 2 — Single-source shapes + factory spread (Part 1, behavior-preserving)

> Each `*Shape()` returns the factory's output with all option-derived values at their zero/default (numbers `0`, strings `''`, booleans `false`, object arrays `[]`), KEEPING factory constants (e.g. attack's `complexity: 1`, `difficulty: 4`). The factory then spreads the shape and re-assigns option/computed fields — output is byte-identical.

### Task 5: Factory↔shape parity test (write first; fails until shapes exist)

**Files:**
- Create: `tests/unit/check/check-shape-parity.test.js`

- [ ] **Step 1: Write the test.** For each subtype it imports the (not-yet-existing) `create<T>CheckParametersShape` / `create<T>CheckResultsShape` named exports and the default factories, and asserts the shape's key-set equals the factory output's key-set (proving they cannot drift). Build representative inputs from each `create<T>CheckOptions` where available; otherwise pass an options object with every read property defined.

```js
import { describe, it, expect } from 'vitest';
import createAttributeCheckParameters, { createAttributeCheckParametersShape }
   from '~/check/types/attribute-check/AttributeCheckParameters.js';
// ...import the other 4 parameter factories + their *Shape named exports...
// ...import the 5 result factories + their *Shape named exports, and createCheckResultsShape...
import { diceResults } from './check-test-helpers.js';

/** Minimal options object exposing every property the parameter factories read. */
const OPTIONS = {
   attribute: 'body', skill: 'athletics', resistance: 'reflexes', complexity: 0, damageToReduce: 0,
   diceMod: 0, difficulty: 0, doubleExpertise: false, doubleTraining: false, expertiseMod: 0,
   extraFailureOnCritical: false, extraSuccessOnCritical: false, trainingMod: 0, damageMod: 0,
   healingMod: 0, resolveCost: 0, attackerAccuracy: 0, attackerMelee: 0, targetDefense: 0, range: 0,
   cleave: false, flurry: false, ineffective: false, magical: false, multiAttack: false,
   penetrating: false, plusExtraSuccessDamage: false, rend: false, type: 'melee',
};

const PARAM_CASES = [
   ['attribute', createAttributeCheckParameters, createAttributeCheckParametersShape],
   // ...resistance, attack, casting, item...
];

describe('check parameter shape ↔ factory parity', () => {
   it.each(PARAM_CASES)('%s parameters: shape keys === factory keys', (_name, factory, shape) => {
      expect(Object.keys(factory(OPTIONS)).sort()).toEqual(Object.keys(shape()).sort());
   });
});

const RESULT_CASES = [
   ['attribute', /* calculate factory */, /* shape */],
   // ...resistance, attack, casting, item...
];

describe('check result shape ↔ factory parity', () => {
   it.each(RESULT_CASES)('%s results: shape keys === factory keys', (_name, factory, shape) => {
      const params = { ...OPTIONS, difficulty: 4, complexity: 1, scalingAspect: [] };
      expect(Object.keys(factory(diceResults([6, 5, 4]), params)).sort()).toEqual(Object.keys(shape()).sort());
   });
});
```

- [ ] **Step 2: Run it; expect failure (no `*Shape` exports yet).**

Run: `npx vitest run tests/unit/check/check-shape-parity.test.js`
Expected: FAIL (import errors / undefined exports).

- [ ] **Step 3: Commit the failing test.**

```bash
git add tests/unit/check/check-shape-parity.test.js
git commit -m "test(check): parity gate for factory output vs shape (red)"
```

### Task 6: Base results shape + `calculateCheckResults` spread

**Files:**
- Modify: `src/check/CheckResults.js`

- [ ] **Step 1: Add the base shape and spread it.**

```js
/**
 * Builds the zero-value shape of the fields every check result shares.
 * @returns {object} The base check-results shape (zeroed).
 */
export function createCheckResultsShape() {
   return {
      criticalFailures: 0,
      criticalSuccesses: 0,
      dice: [],
      expertiseRemaining: 0,
      extraSuccesses: 0,
      succeeded: false,
      successes: 0,
   };
}
```

In `calculateCheckResults`, build `retVal` from the shape then assign computed values:

```js
   const retVal = {
      ...createCheckResultsShape(),
      dice: diceResults.dice,
      expertiseRemaining: diceResults.expertiseRemaining,
   };
```

(The loop and complexity logic below are unchanged.)

- [ ] **Step 2: Run the base results tests.**

Run: `npx vitest run tests/unit/check/calculate-check-results.test.js`
Expected: PASS (output unchanged).

- [ ] **Step 3: Commit.**

```bash
git add src/check/CheckResults.js
git commit -m "refactor(check): base check-results shape, factory spreads it"
```

### Task 7: Per-subtype result shapes + factory spread

**Files:** the 5 `*CheckResults.js`.

- [ ] **Step 1: For each, add a `*Shape()` composing the base + extras, and spread it in the factory.** Exact extras (from the current return objects):

  - Attribute & Resistance: `{ ...createCheckResultsShape(), damageTaken: 0 }`.
  - Attack: `{ ...createCheckResultsShape(), damage: 0 }`.
  - Item: `{ ...createCheckResultsShape(), damage: 0, healing: 0, opposedCheckComplexity: 0 }`.
  - Casting: `{ ...createCheckResultsShape(), damage: 0, extraSuccessesRemaining: 0, healing: 0, scalingAspect: [] }`.

  Example (attribute — apply the same pattern to all five with the right extras):

```js
import calculateCheckResults, { createCheckResultsShape } from '~/check/CheckResults.js';

/**
 * Builds the zero-value shape of an Attribute Check's results.
 * @returns {object} The attribute-results shape.
 */
export function createAttributeCheckResultsShape() {
   return {
      ...createCheckResultsShape(),
      damageTaken: 0,
   };
}

export default function calculateAttributeCheckResults(diceResults, parameters) {
   const baseResults = calculateCheckResults(diceResults, parameters);
   return {
      ...createAttributeCheckResultsShape(),
      criticalFailures: baseResults.criticalFailures,
      criticalSuccesses: baseResults.criticalSuccesses,
      damageTaken: parameters.damageToReduce && !baseResults.succeeded ?
         parameters.damageToReduce - baseResults.successes :
         0,
      dice: baseResults.dice,
      expertiseRemaining: baseResults.expertiseRemaining,
      extraSuccesses: baseResults.extraSuccesses,
      succeeded: baseResults.succeeded,
      successes: baseResults.successes,
   };
}
```

  For casting, the `scalingAspect` mapping logic and damage/healing mods remain; just spread the shape at the top of the returned object.

- [ ] **Step 2: Run check unit tests.**

Run: `npx vitest run tests/unit/check`
Expected: PASS.

- [ ] **Step 3: Commit.**

```bash
git add src/check/types/*/[A-Z]*CheckResults.js
git commit -m "refactor(check): per-subtype result shapes, factories spread them"
```

### Task 8: Per-subtype parameter shapes + factory spread

**Files:** the 5 `*CheckParameters.js`.

- [ ] **Step 1: For each, add a `create<T>CheckParametersShape()` returning the factory output with option-derived values zeroed (keep factory constants), then make the factory `{ ...create<T>CheckParametersShape(), <option/computed overrides> }`.** Exact shapes:

**Attribute:**
```js
export function createAttributeCheckParametersShape() {
   return {
      attribute: '', attributeDice: 0, complexity: 0, damageToReduce: 0, diceMod: 0, difficulty: 0,
      doubleExpertise: false, doubleTraining: false, expertiseMod: 0, extraFailureOnCritical: false,
      extraSuccessOnCritical: false, skill: '', skillExpertise: 0, skillTrainingDice: 0, totalDice: 0,
      totalExpertise: 0, totalTrainingDice: 0, trainingMod: 0,
   };
}
```

**Resistance:**
```js
export function createResistanceCheckParametersShape() {
   return {
      complexity: 0, damageToReduce: 0, diceMod: 0, difficulty: 0, doubleExpertise: false,
      expertiseMod: 0, extraFailureOnCritical: false, extraSuccessOnCritical: false, resistance: '',
      resistanceDice: 0, totalDice: 0, totalExpertise: 0,
   };
}
```

**Attack** (note the factory constants `complexity: 1`, `difficulty: 4`):
```js
export function createAttackCheckParametersShape() {
   return {
      attackNotes: '', attackerAccuracy: 0, attackerMelee: 0, attackName: '', attackerRating: 0,
      attackTrait: [], attribute: '', attributeDice: 0, cleave: false, complexity: 1, customTrait: [],
      damage: 0, damageMod: 0, diceMod: 0, difficulty: 4, doubleExpertise: false, doubleTraining: false,
      expertiseMod: 0, extraFailureOnCritical: false, extraSuccessOnCritical: false, flurry: false,
      img: '', ineffective: false, itemName: '', magical: false, multiAttack: false, penetrating: false,
      plusExtraSuccessDamage: false, range: 0, rend: false, skill: '', skillExpertise: 0,
      skillTrainingDice: 0, targetDefense: 0, totalDice: 0, totalExpertise: 0, totalTrainingDice: 0,
      trainingMod: 0, type: '',
   };
}
```

**Casting:**
```js
export function createCastingCheckParametersShape() {
   return {
      attribute: '', attributeDice: 0, complexity: 0, customTrait: [], damage: 0, damageMod: 0,
      diceMod: 0, difficulty: 0, doubleExpertise: false, doubleTraining: false, expertiseMod: 0,
      extraFailureOnCritical: false, extraSuccessOnCritical: false, healing: 0, healingMod: 0, img: '',
      itemDescription: '', itemName: '', reflexesCheck: false, resilienceCheck: false, scalingAspect: [],
      skill: '', skillExpertise: 0, skillTrainingDice: 0, totalDice: 0, totalExpertise: 0, tradition: '',
      trainingMod: 0, willpowerCheck: false,
   };
}
```

**Item** (reflects Task 1's added fields; `opposedCheck` is a nested object, `damageReducedBy` keeps `'none'`):
```js
export function createItemCheckParametersShape() {
   return {
      attribute: '', attributeDice: 0, checkLabel: '', complexity: 0, customTrait: [], damage: 0,
      damageMod: 0, damageReducedBy: 'none', diceMod: 0, difficulty: 0, doubleExpertise: false,
      doubleTraining: false, expertiseMod: 0, extraFailureOnCritical: false, extraSuccessOnCritical: false,
      healing: 0, healingMod: 0, img: '', isDamage: false, isHealing: false, itemDescription: '',
      itemName: '', opposedCheck: { attribute: '', enabled: false, skill: '' }, resistanceCheck: '',
      resolveCost: 0, scaling: false, skill: '', skillExpertise: 0, skillTrainingDice: 0, totalDice: 0,
      totalExpertise: 0, totalTrainingDice: 0, trainingMod: 0,
   };
}
```

  Then each factory spreads its shape, e.g.:
```js
export default function createAttributeCheckParameters(options) {
   return {
      ...createAttributeCheckParametersShape(),
      attribute: options.attribute,
      complexity: options.complexity,
      damageToReduce: options.damageToReduce,
      diceMod: options.diceMod,
      difficulty: options.difficulty,
      doubleExpertise: options.doubleExpertise,
      doubleTraining: options.doubleTraining,
      expertiseMod: options.expertiseMod,
      extraFailureOnCritical: options.extraFailureOnCritical,
      extraSuccessOnCritical: options.extraSuccessOnCritical,
      skill: options.skill,
      trainingMod: options.trainingMod,
   };
}
```
  (Spread the shape, then re-assign ONLY the option-derived fields each factory currently assigns — leave the zero/constant fields to the shape. Output is identical to the pre-refactor literal.)

- [ ] **Step 2: Run the parity test (Task 5) — now green — plus the full check suite.**

Run: `npx vitest run tests/unit/check`
Expected: PASS, including `check-shape-parity`.

- [ ] **Step 3: Commit.**

```bash
git add src/check/types/*/[A-Z]*CheckParameters.js
git commit -m "refactor(check): per-subtype parameter shapes, factories spread them"
```

---

## Phase 3 — Typed per-subtype chat schemas + golden master (Part 2)

### Task 9: Golden-master schema test (write first; fails until schemas are typed)

**Files:**
- Create: `tests/unit/CheckChatMessageSchemaEquivalence.test.js`

- [ ] **Step 1: Copy the harness from `tests/unit/ItemDataModelSchemaEquivalence.test.js`** — the `MockField`/`MockStringField`/`MockNumberField`/`MockBooleanField`/`MockObjectField`/`MockArrayField`/`MockSchemaField` stand-ins, `kindOf`, `serializeInitial`, `fingerprint`, `sortObjectKeys`, `fingerprintSchema`, `sortFingerprint`, and the `stringField`/`integerField`/`booleanField`/`emptyObjectArray`/`objectElement` golden helpers. Install the same `globalThis.foundry.data.fields` + `TypeDataModel` stand-ins in `beforeAll`, plus a pass-through `game.i18n.localize`. Dynamically import the 5 leaf chat DataModels.

- [ ] **Step 2: Author the golden fingerprints from the shapes (hand-authored — do NOT derive by running `buildSchemaFromShape`, that would be circular).** Add helpers for the new shapes:

```js
/** Golden fingerprint of the shared check-chat base fields (failuresReRolled + message). */
function checkBaseFields() {
   return {
      documentVersion: numberField(0),
      failuresReRolled: booleanField(false),
      message: { element: { kind: 'StringField', nullable: false, required: true }, initial: [],
                 kind: 'ArrayField', nullable: false, required: true },
   };
}

/** Golden fingerprint of a SchemaField built from a flat field map. */
function schemaField(fields) {
   return { fields, kind: 'SchemaField', nullable: false, required: false };
}
```

  Then a golden per subtype, where `parameters`/`results` are `schemaField({...})` whose sub-fields fingerprint each shape field by kind (string→`stringField('')`, integer→`integerField(0)`, boolean→`booleanField(false)`, object array→`emptyObjectArray()`, nested object→`schemaField({...})`). For example, resistance (smallest):

```js
const RESISTANCE = {
   ...checkBaseFields(),
   parameters: schemaField({
      complexity: integerField(0), damageToReduce: integerField(0), diceMod: integerField(0),
      difficulty: integerField(0), doubleExpertise: booleanField(false), expertiseMod: integerField(0),
      extraFailureOnCritical: booleanField(false), extraSuccessOnCritical: booleanField(false),
      resistance: stringField(''), resistanceDice: integerField(0), totalDice: integerField(0),
      totalExpertise: integerField(0),
   }),
   results: schemaField({
      criticalFailures: integerField(0), criticalSuccesses: integerField(0), damageTaken: integerField(0),
      dice: emptyObjectArray(), expertiseRemaining: integerField(0), extraSuccesses: integerField(0),
      succeeded: booleanField(false), successes: integerField(0),
   }),
};
```

  Author the other four (attribute, attack, casting, item) the same way from their Task 7/8 shapes. For item, `opposedCheck` is `schemaField({ attribute: stringField(''), enabled: booleanField(false), skill: stringField('') })`, `damageReducedBy` is `stringField('none')`, `customTrait` is `emptyObjectArray()`. For casting, `scalingAspect` is `emptyObjectArray()`. `createSchemaField` produces `required: false` SchemaFields (no options) — that is why `schemaField()` and the nested `opposedCheck` use `required: false`.

- [ ] **Step 3: Run it; expect failure (schemas are still untyped `ObjectField` bags).**

Run: `npx vitest run tests/unit/CheckChatMessageSchemaEquivalence.test.js`
Expected: FAIL (`parameters`/`results` fingerprint as `ObjectField`, not `SchemaField`).

- [ ] **Step 4: Commit the failing test.**

```bash
git add tests/unit/CheckChatMessageSchemaEquivalence.test.js
git commit -m "test(schema): golden master for the 5 typed check chat schemas (red)"
```

### Task 10: Type the base helper and the 5 leaf chat schemas

**Files:**
- Modify: `src/check/chat-message/CheckChatMessageDataModel.js`
- Modify: the 5 `<T>CheckChatMessageDataModel.js`

- [ ] **Step 1: Base — drop the untyped `parameters`/`results`, add the helper.**

```js
import TitanChatMessageDataModel from '~/document/types/chat-message/ChatMessageDataModel.js';
import buildSchemaFromShape from '~/helpers/utility-functions/BuildSchemaFromShape.js';
import createArrayField from '~/helpers/utility-functions/CreateArrayField.js';
import createBooleanField from '~/helpers/utility-functions/CreateBooleanField.js';
import createSchemaField from '~/helpers/utility-functions/CreateSchemaField.js';
import createStringField from '~/helpers/utility-functions/CreateStringField.js';

export default class CheckChatMessageDataModel extends TitanChatMessageDataModel {
   static _defineDocumentSchema() {
      const schema = super._defineDocumentSchema();
      schema.failuresReRolled = createBooleanField(false);
      schema.message = createArrayField(createStringField());
      return schema;
   }

   /**
    * Builds the typed parameters/results portion of a check chat schema from a subtype's shapes.
    * @param {object} parametersShape - The zero-value parameter shape for the check subtype.
    * @param {object} resultsShape - The zero-value result shape for the check subtype.
    * @returns {object} A field map with typed `parameters` and `results` SchemaFields.
    * @protected
    */
   static _defineCheckDataSchema(parametersShape, resultsShape) {
      return {
         parameters: createSchemaField(buildSchemaFromShape(parametersShape)),
         results: createSchemaField(buildSchemaFromShape(resultsShape)),
      };
   }
}
```

- [ ] **Step 2: Each leaf overrides `_defineDocumentSchema()`.** Example (attribute); apply the same shape, swapping the imports/shape names per subtype:

```js
import CheckChatMessageDataModel from '~/check/chat-message/CheckChatMessageDataModel.js';
import AttributeCheckChatMessage from '~/check/types/attribute-check/chat-message/AttributeCheckChatMessage.svelte';
import { createAttributeCheckParametersShape } from '~/check/types/attribute-check/AttributeCheckParameters.js';
import { createAttributeCheckResultsShape } from '~/check/types/attribute-check/AttributeCheckResults.js';

export default class AttributeCheckChatMessageDataModel extends CheckChatMessageDataModel {
   static _defineDocumentSchema() {
      return {
         ...super._defineDocumentSchema(),
         ...CheckChatMessageDataModel._defineCheckDataSchema(
            createAttributeCheckParametersShape(),
            createAttributeCheckResultsShape(),
         ),
      };
   }

   get component() {
      return AttributeCheckChatMessage;
   }
}
```

  Do the same for resistance, attack, casting, item — each importing its own `create<T>CheckParametersShape`/`create<T>CheckResultsShape`. (attack/casting/item extend `AttributeCheckChatMessageDataModel`; their `super._defineDocumentSchema()` returns attribute's typed schema, which they overwrite via the helper — correct.)

- [ ] **Step 3: Run the golden master — now green.**

Run: `npx vitest run tests/unit/CheckChatMessageSchemaEquivalence.test.js`
Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add src/check/chat-message/CheckChatMessageDataModel.js src/check/types/*/chat-message/*CheckChatMessageDataModel.js
git commit -m "feat(schema): typed per-subtype check chat schemas from shared shapes"
```

---

## Phase 4 — Verification & docs

### Task 11: Full suite + build + chat-render e2e

- [ ] **Step 1: Full unit suite.** Run: `npx vitest run`. Expected: all green (existing + `check-shape-parity` + `CheckChatMessageSchemaEquivalence`).
- [ ] **Step 2: Build.** Run: `npm run build`. Expected: single chunk, no dynamic imports, probe-free, no errors.
- [ ] **Step 3: e2e (world launched).** Run: `npx playwright test tests/e2e/interaction-rolls.spec.js tests/e2e/item-check-damage-reduction.spec.js` plus any `checks-*`/render-smoke specs. Expected: PASS at parity (cards render; reduction feeds). Confirm all 5 check cards render (attribute/resistance/attack/casting/item) and that item/casting cards now show custom traits.
- [ ] **Step 4: Lint.** Run: `npx eslint .` and `npx stylelint "src/**/*.{css,svelte}"`. Expected: clean.

### Task 12: Docs + skill update

- [ ] **Step 1:** Update `docs/TODO.md` — mark follow-up D DONE under "Chat message subtypes"; note any genuinely-separate bug found by the propagation audit (logged to `docs/OPEN_BUGS.md`, not fixed here).
- [ ] **Step 2:** Update the `titan-codebase` skill (`.claude/skills/titan-codebase/references/`) to reflect: check parameter/result factories spread co-located `*Shape()` single sources; check chat schemas are typed per subtype via `buildSchemaFromShape`; item/casting parameters mirror item config (damageReducedBy/isDamage/opposedCheck.enabled). Report the diff in the final message.
- [ ] **Step 3:** Refresh `docs/superpowers/HANDOFF.md` for the next session (D shipped; NEXT = Phase 3 reports / Phase 4 effect+cleanup).
- [ ] **Step 4: Commit.**

```bash
git add docs/TODO.md docs/OPEN_BUGS.md .claude/skills/titan-codebase docs/superpowers/HANDOFF.md
git commit -m "docs: follow-up D done; refresh TODO/handoff + titan-codebase map"
```

---

## Notes for the implementer

- **Propagation audit is authoritative** (spec §Propagation audit): before finishing Phase 1/3, enumerate every `system.parameters.X`/`system.results.X` read in all 5 check cards AND their children; confirm each is set on the rolled parameters and present in the typed shape. Fix unbacked reads per the spec (repoint stale → real field; propagate intended fields; drop sourceless reads). Log any genuinely-separate bug to `docs/OPEN_BUGS.md`.
- **Behavior preservation (Phase 2):** the only acceptable diff in factory output is none. If the parity test or `calculate-check-results` tests change, the spread/override is wrong — fix the shape, do not change the test.
- **No fixed sleeps in e2e** (conventions): use `titanWait`/`expect.poll`/auto-retrying locators.
- **Never `git add packs/`** — stage explicit paths only.
- **Integer assumption:** all check numeric fields are integers, so `buildSchemaFromShape` (integer fields for all numbers) is correct here.
