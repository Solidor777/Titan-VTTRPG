# TITAN E2E — Checks Engine (2b-1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Project rule:** route `.js` work to the `titan-svelte-dev` subagent with `titan-codebase` loaded; follow `.claude/CLAUDE.md` style rules.

**Goal:** Pure-unit and property-based (fast-check) verification of the TITAN check result engine — the base calculator, the expertise optimizer, and the five per-type result calculators — proving they produce accurate outputs across crafted cases and randomized inputs.

**Architecture:** These are pure `(dice, parameters) → results` functions with no Foundry dependency, imported via the `~/` alias into Vitest. fast-check (already a devDependency) is imported directly for property tests. No browser, no Foundry runtime, no injection.

**Tech Stack:** Vitest (happy-dom, `~/` alias, `tests/unit/**` globbed), fast-check 4.x.

> **These are characterization/verification tests for EXISTING, presumed-correct code — not TDD for new code.** Each test should PASS on first run. A FAILURE means a genuine engine bug was found: STOP and report it (do not change the expected value to match a wrong observation).

---

## Confirmed source facts

- `calculateCheckResults(diceResults, parameters)` — `src/check/CheckResults.js`. `diceResults` is
  `{ dice: CheckDie[], expertiseRemaining: number }`; `CheckDie` is `{ base, expertiseApplied, final }`;
  only `die.final` is read. Per die: `final === 6` → `criticalSuccesses++`, `successes +=
  extraSuccessOnCritical ? 2 : 1`; else `final >= difficulty` → `successes++`; else `final === 1` →
  `criticalFailures++`, and if `extraFailureOnCritical` then `successes -= 1`. When `complexity > 0`:
  `succeeded = successes >= complexity`; `extraSuccesses = successes - complexity` when greater. When
  `complexity === 0`, `succeeded` stays `false`.
- `_applyExpertise(dice)` — method on `TitanCheck` (`src/check/Check.js`); `dice` is `CheckDie[]`. Reads
  `this.parameters.{totalExpertise, difficulty, extraSuccessOnCritical, extraFailureOnCritical}`. If
  `extraFailureOnCritical`, spends 1 to raise each `final === 1` to `2`. Then for `increment` 1..5, raises
  dice exactly `increment` below `difficulty` up to `difficulty` (cost `increment`), and — if
  `extraSuccessOnCritical` — dice `increment` below `6` up to `6`. Returns `{ dice, expertiseRemaining }`.
  `new TitanCheck(params)` only stores params; importing/instantiating touches no Foundry globals.
- Per-type calculators (each imports only `calculateCheckResults`):
  - `calculateAttributeCheckResults` / `calculateResistanceCheckResults`: add `damageTaken =
    (damageToReduce && !succeeded) ? damageToReduce - successes : 0`.
  - `calculateAttackCheckResults`: `damage = succeeded ? parameters.damage + parameters.damageMod : 0`,
    `+ extraSuccesses` if `parameters.plusExtraSuccessDamage`.
  - `calculateItemCheckResults`: on success, `damage = parameters.damage + parameters.damageMod`
    (`+ extraSuccesses` if `parameters.scaling`) when `parameters.damage`; `healing` analogous;
    `opposedCheckComplexity = parameters.opposedCheck ? 1 + extraSuccesses : 0`.
  - `calculateCastingCheckResults`: on success, `damage = parameters.damage`, `healing =
    parameters.healing`; clones `parameters.scalingAspect`; if exactly one aspect is affordable
    (`cost <= extraSuccesses`), `delta = floor(extraSuccesses / cost)`, `currentValue += delta *
    max(initialValue, 1)`, `extraSuccessesRemaining -= delta * cost`, and `damage`/`healing` `+= delta`
    per the aspect's `isDamage`/`isHealing`; then `damage += damageMod` if `damage > 0`, `healing +=
    healingMod` if `healing > 0`.
- Vitest config globs `tests/unit/**/*.test.js`, aliases `~/` → `src/`, env happy-dom. `tests/setup.js`
  stubs `foundry`/`Hooks` only — the engine needs none of it.
- fast-check is imported as `import fc from 'fast-check'`. If the default import resolves `undefined` at
  runtime, switch to `import * as fc from 'fast-check'` (note it and continue).

---

## Task 1: Base calculator — crafted cases + properties

**Files:**
- Create: `tests/unit/check/check-test-helpers.js`
- Create: `tests/unit/check/calculate-check-results.test.js`

- [ ] **Step 1: Create the shared test helpers**

```js
// tests/unit/check/check-test-helpers.js

/**
 * Builds a CheckDiceResults object from an array of final die face values.
 * @param {number[]} finals - The final face values (post-expertise) for each die.
 * @param {number} [expertiseRemaining] - The expertise remaining to carry through.
 * @returns {{ dice: object[], expertiseRemaining: number }} A CheckDiceResults for the result calculators.
 */
export function diceResults(finals, expertiseRemaining = 0) {
   return {
      dice: finals.map((final) => ({ base: final, expertiseApplied: 0, final: final })),
      expertiseRemaining: expertiseRemaining,
   };
}

/**
 * Builds a raw CheckDie array from an array of face values, for `_applyExpertise`.
 * @param {number[]} finals - The face values; `base` and `final` are seeded equal.
 * @returns {object[]} An array of `{ base, expertiseApplied, final }`.
 */
export function dice(finals) {
   return finals.map((final) => ({ base: final, expertiseApplied: 0, final: final }));
}

/**
 * Independent oracle for the success count, mirroring the engine's if/else-if structure.
 * @param {number[]} finals - The final die faces.
 * @param {object} params - `{ difficulty, extraSuccessOnCritical, extraFailureOnCritical }`.
 * @returns {number} The expected number of successes.
 */
export function expectedSuccesses(finals, params) {
   let successes = 0;
   for (const final of finals) {
      if (final === 6) {
         successes += params.extraSuccessOnCritical ? 2 : 1;
      } else if (final >= params.difficulty) {
         successes += 1;
      } else if (final === 1 && params.extraFailureOnCritical) {
         successes -= 1;
      }
   }
   return successes;
}
```

- [ ] **Step 2: Write the crafted-case + property tests**

```js
// tests/unit/check/calculate-check-results.test.js
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import calculateCheckResults from '~/check/CheckResults.js';
import { diceResults, expectedSuccesses } from './check-test-helpers.js';

describe('calculateCheckResults — crafted cases', () => {
   it('counts normal successes, one crit success, one crit failure (flags off)', () => {
      const params = {
         difficulty: 4,
         complexity: 2,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
      };
      const r = calculateCheckResults(diceResults([6, 5, 4, 3, 2, 1]), params);
      expect(r.successes).toBe(3);
      expect(r.criticalSuccesses).toBe(1);
      expect(r.criticalFailures).toBe(1);
      expect(r.succeeded).toBe(true);
      expect(r.extraSuccesses).toBe(1);
   });

   it('doubles a crit success when extraSuccessOnCritical is set', () => {
      const params = {
         difficulty: 4,
         complexity: 2,
         extraSuccessOnCritical: true,
         extraFailureOnCritical: false,
      };
      const r = calculateCheckResults(diceResults([6, 5, 4, 3, 2, 1]), params);
      expect(r.successes).toBe(4);
      expect(r.extraSuccesses).toBe(2);
   });

   it('subtracts a success per crit failure when extraFailureOnCritical is set', () => {
      const params = {
         difficulty: 4,
         complexity: 2,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: true,
      };
      const r = calculateCheckResults(diceResults([6, 5, 4, 1, 1]), params);
      expect(r.successes).toBe(1);
      expect(r.criticalFailures).toBe(2);
      expect(r.succeeded).toBe(false);
      expect(r.extraSuccesses).toBe(0);
   });

   it('never marks success when complexity is 0', () => {
      const params = {
         difficulty: 4,
         complexity: 0,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
      };
      const r = calculateCheckResults(diceResults([6, 6, 6]), params);
      expect(r.successes).toBe(3);
      expect(r.succeeded).toBe(false);
   });
});

describe('calculateCheckResults — properties', () => {
   it('successes match the oracle; succeeded and extraSuccesses follow the rules', () => {
      fc.assert(
         fc.property(
            fc.array(fc.integer({ min: 1, max: 6 }), { maxLength: 10 }),
            fc.integer({ min: 2, max: 6 }),
            fc.integer({ min: 0, max: 6 }),
            fc.boolean(),
            fc.boolean(),
            (finals, difficulty, complexity, esoc, efoc) => {
               const params = {
                  difficulty: difficulty,
                  complexity: complexity,
                  extraSuccessOnCritical: esoc,
                  extraFailureOnCritical: efoc,
               };
               const r = calculateCheckResults(diceResults(finals), params);
               const expected = expectedSuccesses(finals, params);
               const succeeded = complexity > 0 ? expected >= complexity : false;
               const extra = complexity > 0 && expected > complexity ? expected - complexity : 0;
               return r.successes === expected && r.succeeded === succeeded && r.extraSuccesses === extra;
            },
         ),
      );
   });
});
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run tests/unit/check/calculate-check-results.test.js`
Expected: PASS (4 crafted + 1 property). If any crafted assertion fails, a base-engine bug was found — STOP and report the case.

- [ ] **Step 4: Commit**

```bash
git add tests/unit/check/check-test-helpers.js tests/unit/check/calculate-check-results.test.js
git commit -m "test(check): verify base check-result engine (crafted + fast-check)"
```

---

## Task 2: Expertise optimizer — crafted cases + invariants

**Files:**
- Create: `tests/unit/check/apply-expertise.test.js`

- [ ] **Step 1: Write the tests**

```js
// tests/unit/check/apply-expertise.test.js
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import TitanCheck from '~/check/Check.js';
import { dice } from './check-test-helpers.js';

describe('_applyExpertise — crafted cases', () => {
   it('raises dice one below difficulty up to difficulty, cheapest first', () => {
      const check = new TitanCheck({
         difficulty: 4,
         totalExpertise: 3,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
      });
      const out = check._applyExpertise(dice([3, 3, 2]));
      expect(out.dice.map((d) => d.final)).toEqual([4, 4, 2]);
      expect(out.expertiseRemaining).toBe(1);
   });

   it('spends expertise to neutralize crit failures when extraFailureOnCritical is set', () => {
      const check = new TitanCheck({
         difficulty: 4,
         totalExpertise: 2,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: true,
      });
      const out = check._applyExpertise(dice([4, 1, 1]));
      expect(out.dice.map((d) => d.final)).toEqual([4, 2, 2]);
      expect(out.expertiseRemaining).toBe(0);
   });
});

describe('_applyExpertise — invariants', () => {
   it('conserves expertise, never lowers a die, and lands raised dice on difficulty/6/2', () => {
      fc.assert(
         fc.property(
            fc.array(fc.integer({ min: 1, max: 6 }), { maxLength: 8 }),
            fc.integer({ min: 0, max: 10 }),
            fc.integer({ min: 2, max: 6 }),
            fc.boolean(),
            fc.boolean(),
            (finals, totalExpertise, difficulty, esoc, efoc) => {
               const check = new TitanCheck({
                  difficulty: difficulty,
                  totalExpertise: totalExpertise,
                  extraSuccessOnCritical: esoc,
                  extraFailureOnCritical: efoc,
               });
               const input = dice(finals);
               const bases = input.map((d) => d.base);
               const out = check._applyExpertise(input);
               const spent = out.dice.reduce((sum, d) => sum + d.expertiseApplied, 0);
               const conserved = spent + out.expertiseRemaining === totalExpertise;
               const nonNegative = out.expertiseRemaining >= 0;
               const neverLowered = out.dice.every((d, i) => d.final >= bases[i]);
               const landed = out.dice.every(
                  (d, i) => d.final === bases[i] || d.final === difficulty || d.final === 6 || d.final === 2,
               );
               return conserved && nonNegative && neverLowered && landed;
            },
         ),
      );
   });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/unit/check/apply-expertise.test.js`
Expected: PASS (2 crafted + 1 property). A failure is a genuine expertise-optimizer bug — STOP and report.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/check/apply-expertise.test.js
git commit -m "test(check): verify expertise optimizer (crafted + invariants)"
```

---

## Task 3: Per-type calculators — attribute, resistance, attack, item

**Files:**
- Create: `tests/unit/check/type-results.test.js`

- [ ] **Step 1: Write the tests**

```js
// tests/unit/check/type-results.test.js
import { describe, it, expect } from 'vitest';
import calculateAttributeCheckResults from '~/check/types/attribute-check/AttributeCheckResults.js';
import calculateResistanceCheckResults from '~/check/types/resistance-check/ResistanceCheckResults.js';
import calculateAttackCheckResults from '~/check/types/attack-check/AttackCheckResults.js';
import calculateItemCheckResults from '~/check/types/item-check/ItemCheckResults.js';
import { diceResults } from './check-test-helpers.js';

describe('attribute & resistance results — damageTaken', () => {
   it('reduces incoming damage by the number of successes on a failed check', () => {
      const params = {
         difficulty: 4,
         complexity: 5,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
         damageToReduce: 5,
      };
      const r = calculateAttributeCheckResults(diceResults([5, 4, 2]), params);
      expect(r.succeeded).toBe(false);
      expect(r.successes).toBe(2);
      expect(r.damageTaken).toBe(3);
   });

   it('takes no damage on a successful resistance check', () => {
      const params = {
         difficulty: 4,
         complexity: 1,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
         damageToReduce: 5,
      };
      const r = calculateResistanceCheckResults(diceResults([5, 4, 2]), params);
      expect(r.succeeded).toBe(true);
      expect(r.damageTaken).toBe(0);
   });
});

describe('attack results — damage', () => {
   it('deals base damage plus mod on success', () => {
      const params = {
         difficulty: 4,
         complexity: 1,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
         damage: 3,
         damageMod: 1,
         plusExtraSuccessDamage: false,
      };
      const r = calculateAttackCheckResults(diceResults([5, 4]), params);
      expect(r.damage).toBe(4);
   });

   it('adds extra-success damage when plusExtraSuccessDamage is set', () => {
      const params = {
         difficulty: 4,
         complexity: 1,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
         damage: 3,
         damageMod: 1,
         plusExtraSuccessDamage: true,
      };
      const r = calculateAttackCheckResults(diceResults([5, 4, 5]), params);
      expect(r.extraSuccesses).toBe(2);
      expect(r.damage).toBe(6);
   });

   it('deals no damage on failure', () => {
      const params = {
         difficulty: 4,
         complexity: 5,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
         damage: 3,
         damageMod: 1,
         plusExtraSuccessDamage: false,
      };
      const r = calculateAttackCheckResults(diceResults([5, 4]), params);
      expect(r.damage).toBe(0);
   });
});

describe('item results — damage scaling and opposed complexity', () => {
   it('scales damage with extra successes when scaling is enabled', () => {
      const params = {
         difficulty: 4,
         complexity: 1,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
         damage: 2,
         damageMod: 1,
         healing: 0,
         scaling: true,
         opposedCheck: false,
      };
      const r = calculateItemCheckResults(diceResults([5, 4, 5]), params);
      expect(r.extraSuccesses).toBe(2);
      expect(r.damage).toBe(5);
   });

   it('sets opposed-check complexity to 1 + extra successes', () => {
      const params = {
         difficulty: 4,
         complexity: 1,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
         damage: 0,
         damageMod: 0,
         healing: 0,
         scaling: false,
         opposedCheck: true,
      };
      const r = calculateItemCheckResults(diceResults([5, 4, 5]), params);
      expect(r.opposedCheckComplexity).toBe(3);
   });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/unit/check/type-results.test.js`
Expected: PASS (7 tests). A failure is a genuine per-type-calculator bug — STOP and report.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/check/type-results.test.js
git commit -m "test(check): verify attribute/resistance/attack/item result calculators"
```

---

## Task 4: Per-type calculators — casting (base + scaling aspect)

**Files:**
- Modify: `tests/unit/check/type-results.test.js` (append a casting describe block)

- [ ] **Step 1: Append the casting tests**

Add the import at the top of `tests/unit/check/type-results.test.js`:

```js
import calculateCastingCheckResults from '~/check/types/casting-check/CastingCheckResults.js';
```

Append this describe block at the end of the file:

```js
describe('casting results — damage, healing, scaling aspect', () => {
   it('applies base damage plus mod on success with no scaling aspects', () => {
      const params = {
         difficulty: 4,
         complexity: 1,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
         damage: 3,
         healing: 0,
         damageMod: 1,
         healingMod: 0,
         scalingAspect: [],
      };
      const r = calculateCastingCheckResults(diceResults([5, 4]), params);
      expect(r.damage).toBe(4);
      expect(r.healing).toBe(0);
      expect(r.scalingAspect).toEqual([]);
   });

   it('maximizes the single affordable scaling aspect and adds its delta to damage', () => {
      const params = {
         difficulty: 4,
         complexity: 1,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
         damage: 2,
         healing: 0,
         damageMod: 0,
         healingMod: 0,
         scalingAspect: [
            {
               isDamage: true,
               isHealing: false,
               cost: 1,
               initialValue: 1,
               label: 'Damage',
            },
         ],
      };
      const r = calculateCastingCheckResults(diceResults([5, 4, 5, 4]), params);
      expect(r.extraSuccesses).toBe(3);
      expect(r.damage).toBe(5);
      expect(r.scalingAspect[0].currentValue).toBe(4);
      expect(r.extraSuccessesRemaining).toBe(0);
   });

   it('deals no damage or healing on a failed casting check', () => {
      const params = {
         difficulty: 4,
         complexity: 5,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
         damage: 3,
         healing: 2,
         damageMod: 1,
         healingMod: 1,
         scalingAspect: [],
      };
      const r = calculateCastingCheckResults(diceResults([5, 4]), params);
      expect(r.succeeded).toBe(false);
      expect(r.damage).toBe(0);
      expect(r.healing).toBe(0);
   });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/unit/check/type-results.test.js`
Expected: PASS (10 tests total). A failure in the scaling-aspect case is a genuine casting bug — STOP and report.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/check/type-results.test.js
git commit -m "test(check): verify casting result calculator (base + scaling aspect)"
```

---

## Final verification

- [ ] **Run the whole check engine suite + full unit suite**

Run: `npx vitest run tests/unit/check`
Expected: PASS — all four files (base, expertise, type-results incl. casting).

Run: `npx vitest run`
Expected: PASS — the new check tests plus all pre-existing unit tests, no regressions.

---

## Phase exit criteria

- The base calculator, expertise optimizer, and all five per-type calculators have crafted-case coverage
  and (for the base calculator and expertise optimizer) fast-check property coverage, all green.
- Any discovered engine bug was reported, not masked.
- Next: 2b-2 (checks-integration) — the `forceDice` helper and one forced-dice Playwright test per check
  type, plumbing actor stats through the now-verified engine into chat flags.
