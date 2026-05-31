# TITAN E2E 2b-2 Checks-Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove each dialog-bypassing `roll<Type>Check` API assembles its parameters from the actor and plumbs the rolled dice through the (already unit-verified) check engine into `flags.titan`, by forcing a known dice sequence and asserting exact parameters + results.

**Architecture:** A Playwright spec drives all five roll APIs on a single purpose-built "E2E Roller" actor. A deterministic-dice helper stubs `CONFIG.Dice.randomUniform` (the seam Foundry's `DiceTerm.randomFace` consumes) so each die lands on a chosen face. Expected results are computed by an *independent* oracle (a standalone reimplementation of the success/crit rules), never by importing the production engine — so the test can catch an engine regression rather than rubber-stamp it. The fixture grants `totalExpertise === 0` on every check, so each die's post-expertise `final` equals its forced `base` and the oracle needs only the forced faces.

**Tech Stack:** Playwright (E2E, against live Foundry on `:30000`), Vitest (unit validation of the oracle), pure ESM JS. No fast-check here (forced dice are deterministic). Follows `.claude/CLAUDE.md` style; all `.js` work routed to the `titan-svelte-dev` subagent.

---

## Working agreements (carry from `docs/superpowers/e2e-suite-status.md`)

- **Delegation:** route ALL `.js` work to the `titan-svelte-dev` subagent (loads `svelte-5` / `foundry-vtt` / `foundry-svelte` / `titan-codebase`). Follow `.claude/CLAUDE.md` style: 120-col wrap, multi-line objects (>1 prop), typed + commented variables, multi-line function doc-comments.
- **Branch:** stay on `development`. **No git worktree** — the running Foundry on `:30000` serves THIS directory's built `index.js`.
- **Login as `E2E GM 1`** via the `login(page)` default in `tests/e2e/fixtures.js` — never the human's `Gamemaster` session.
- **Build output is gitignored** (`index.js`, `index.js.map`, `style.css`) — never `git add` it. This plan adds NO `src/` changes, so no rebuild is needed; the live Foundry already serves the current engine.
- **`packs/effects/**` LevelDB churn** during e2e runs is runtime noise — leave it uncommitted.

## Design decisions (locked with the user)

- **Assert strategy — Zero-expertise + oracle.** Fixtures roll with `totalExpertise === 0`, so `results.dice[i].final === results.dice[i].base === forcedFace`. Expected `successes`/`criticalSuccesses`/`criticalFailures`/`succeeded`/`extraSuccesses` come from an independent oracle, asserted for exact equality. The forced faces are also asserted directly against `results.dice[].base` (dice ground-truth).
- **Spec scope — Complement.** New file `tests/e2e/checks-integration.spec.js` owns parameter-assembly + forced-dice result values. The existing `tests/e2e/interaction-rolls.spec.js` (message-exists / flag-type / DOM-render) is left untouched.

## Determinism seam (confirmed against v14 source)

- `DiceTerm.randomFace()` → `mapRandomFace(CONFIG.Dice.randomUniform())`, and for a d6 `mapRandomFace(u) = Math.ceil((1 - u) * 6)` (`C:\FoundryVTT\V14\foundry\client\dice\terms\dice.mjs:365`, `:376`). `CONFIG.Dice.randomUniform` defaults to `MersenneTwister.random` (`client/config.mjs:403`) and is a writable property — stubbable at runtime.
- To force face `f` (1..6): return `u = (6.5 - f) / 6`. Check: `Math.ceil((1 - (6.5-f)/6) * 6) = Math.ceil(f - 0.5) = f`.
- `rollCheckDice(n)` (`src/helpers/utility-functions/RollCheckDice.js`) builds `new Roll(`${n}d6`)`, evaluates, then **sorts results descending**. So `CONFIG.Dice.randomUniform` is called exactly `n` times for an `n`-dice check, and `results.dice[].base` is the forced faces sorted high→low.

## Fixture: the "E2E Roller" actor (concrete derived values)

A GM-owned `player` actor owning one weapon, one spell, and one ability. The ability carries BOTH an inlined `check[]` entry (for the item check) AND two `flatModifier` rules elements that boost `body` and `mind` by `+2` each (abilities apply rules elements on mere ownership — no equip). Player attribute/skill bases are `1`/`0` respectively; rules elements push `body.value` and `mind.value` to `3`.

Resulting per-check parameters for this fixture (all `totalExpertise === 0`, all skills untrained):

| Check (invocation)                                              | `totalDice` | `difficulty` | `complexity` | `totalExpertise` |
|-----------------------------------------------------------------|:-----------:|:------------:|:------------:|:----------------:|
| attribute `{ attribute: 'body' }`                               |      3      |      4       |      0       |        0         |
| resistance `{ resistance: 'resilience' }`                       |      1      |      4       |      0       |        0         |
| attack `{ itemId: weapon, attackIdx: 0 }` (melee, no target)    |      3      |      4       |      1       |        0         |
| casting `{ itemId: spell }` (mind/arcana)                       |      3      |      4       |      1       |        0         |
| item `{ itemId: ability, checkIdx: 0 }` (body/arcana entry)     |      3      |      4       |      1       |        0         |

Why each value (evidence gathered from source):

- **attribute body:** `totalDice = attributeDice + totalTrainingDice + diceMod = body.value(3) + 0 + 0` (`CharacterDataModel.js:3665`,`3687`). `difficulty` default `4`, `complexity` default `0` (`AttributeCheckOptions.js`).
- **resistance resilience:** `totalDice = resistanceDice + diceMod = resilience.value(1) + 0` (`CharacterDataModel.js:2135`,`2138`). Resistances derive from attribute **baseValues** (`resilience.baseValue = body.baseValue + floor(soul.baseValue*0.5) = 1 + 0`, `:626-642`); the `flatModifier` boosts the attribute's final `value`, applied AFTER base resistances, so **resilience stays `1`** — deliberately exercising a 1-die check. `difficulty` `4`, `complexity` `0`.
- **attack melee:** default weapon `attack[0]` is `attribute:'body', skill:'meleeWeapons', type:'melee'` (`WeaponAttack.js:23-36`). `totalDice = body.value(3) + meleeWeapons.training(0) + diceMod(0)`. With no target, `targetDefense = attackerMelee = ceil(body.value/2)`-derived rating; `difficulty = clamp(targetDefense - attackerRating + 4, 2, 6) = clamp(0+4) = 4` because `targetDefense === attackerRating` (`CharacterDataModel.js:2504-2511`,`2708-2711`). `complexity` hardcoded `1` in `createAttackCheckParameters`.
- **casting:** default spell `castingCheck` is `attribute:'mind', skill:'arcana'` (`SpellDataModel.js:33-40`); auto-DC for an aspect-less spell yields `difficulty 4, complexity 1` (`:139-155`). `totalDice = mind.value(3) + arcana.training(0) + 0`.
- **item:** the inlined `check[0]` entry (`difficulty:4, complexity:1, attribute:'body', skill:'arcana'`) maps straight through (`CharacterDataModel.js:3389-3399`); `totalDice = body.value(3) + arcana.training(0) + 0`.

Forced face sequence used by every test: **`[6, 4, 1]`**. A 3-dice check consumes all three (sorted desc → `[6,4,1]`); the 1-die resistance check consumes only `[6]`. Oracle expectations for `difficulty 4`, `extraSuccessOnCritical=false`, `extraFailureOnCritical=false`:

- faces `[6,4,1]`: `successes=2` (6→+1, 4→+1, 1→+0), `criticalSuccesses=1`, `criticalFailures=1`.
  - complexity `0` (attribute): `succeeded=false`, `extraSuccesses=0`.
  - complexity `1` (attack/casting/item): `succeeded=true`, `extraSuccesses=1`.
- faces `[6]` (resistance, complexity `0`): `successes=1`, `criticalSuccesses=1`, `criticalFailures=0`, `succeeded=false`, `extraSuccesses=0`.

## File structure

- **Create** `tests/e2e/dice.js` — `forceDice(page, faces)` / `resetDice(page)` RNG-stub helpers.
- **Create** `tests/e2e/dice.spec.js` — guards the determinism seam (forces faces, rolls real `Roll`s, asserts faces).
- **Create** `tests/shared/checkOracle.js` — `expectedCheckResults(faces, params)`, the independent results oracle.
- **Create** `tests/unit/check/check-oracle.test.js` — Vitest validation of the oracle against hand-computed cases.
- **Modify** `tests/shared/builders.js` — add `buildE2ERollerActorData()` + `buildE2ERollerItemData()`.
- **Create** `tests/e2e/checks-integration.spec.js` — the five forced-dice integration tests.
- **Modify** `docs/superpowers/e2e-suite-status.md` — mark 2b-2 done, set next = 2b-3.

---

## Task 1: Deterministic-dice helper (`tests/e2e/dice.js`) + seam guard spec

**Files:**
- Create: `tests/e2e/dice.js`
- Create: `tests/e2e/dice.spec.js`

- [ ] **Step 1: Write the failing seam-guard spec**

Create `tests/e2e/dice.spec.js`:

```javascript
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { forceDice, resetDice } from './dice.js';

/**
 * Guards the determinism seam the whole checks-integration approach depends on: stubbing
 * `CONFIG.Dice.randomUniform` so a d6 lands on a chosen face. If Foundry ever changes
 * `DiceTerm.mapRandomFace`, this spec fails loudly before the check tests do.
 */
test.describe('forced dice seam', () => {
   test.afterEach(async ({ page }) => {
      // Restore the original RNG so a failed test cannot leak a stub into later specs.
      await resetDice(page);
   });

   test('forceDice maps each queued face onto a real Roll', async ({ page }) => {
      await login(page);

      // Force three faces, then roll a real 3d6 inside the world and read the raw results.
      await forceDice(page, [6, 4, 1]);
      const faces = await page.evaluate(async () => {
         const roll = new Roll('3d6');
         await roll.evaluate();
         return roll.terms[0].results.map((die) => die.result);
      });

      // The Roll consumes the queue in order; assert exact faces (order as produced, pre-sort).
      expect(faces).toEqual([6, 4, 1]);
   });

   test('resetDice restores non-deterministic rolling', async ({ page }) => {
      await login(page);

      // Install then immediately reset; a fresh stub must no longer be in effect.
      await forceDice(page, [2]);
      await resetDice(page);
      const isStubbed = await page.evaluate(() => globalThis.__titanForcedDiceActive === true);
      expect(isStubbed).toBe(false);
   });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/e2e/dice.spec.js --reporter=list`
Expected: FAIL — `dice.js` does not exist (module resolution error / cannot import `forceDice`).

- [ ] **Step 3: Implement the helper**

Create `tests/e2e/dice.js`:

```javascript
/**
 * Deterministic-dice helpers for Playwright check tests.
 *
 * Foundry maps a uniform random `u` in [0,1) to a d6 face via `Math.ceil((1 - u) * 6)`
 * (DiceTerm.mapRandomFace). To force face `f`, feed `u = (6.5 - f) / 6`. These helpers replace
 * `CONFIG.Dice.randomUniform` with a queue-backed stub so successive die rolls land on chosen faces,
 * then restore the original RNG.
 */

/**
 * Installs a queue-backed stub on `CONFIG.Dice.randomUniform` that forces the given faces, in order.
 * Once the queue drains, the stub falls back to the original RNG. Safe to call repeatedly; the
 * original RNG is captured only once.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @param {number[]} faces - The d6 faces (1-6) to force, in roll order.
 * @returns {Promise<void>} Resolves once the stub is installed in the page context.
 */
export async function forceDice(page, faces) {
   await page.evaluate((forcedFaces) => {
      // Capture the genuine RNG exactly once so repeated forcing never loses it.
      if (typeof globalThis.__titanOriginalRandomUniform !== 'function') {
         globalThis.__titanOriginalRandomUniform = CONFIG.Dice.randomUniform;
      }

      // The queue of uniform values mapped from the requested faces (u = (6.5 - f) / 6).
      globalThis.__titanForcedQueue = forcedFaces.map((face) => (6.5 - face) / 6);
      globalThis.__titanForcedDiceActive = true;

      // The stub: drain the queue, then defer to the original RNG.
      CONFIG.Dice.randomUniform = () => {
         if (globalThis.__titanForcedQueue.length > 0) {
            return globalThis.__titanForcedQueue.shift();
         }
         return globalThis.__titanOriginalRandomUniform();
      };
   }, faces);
}

/**
 * Restores the original `CONFIG.Dice.randomUniform` and clears the forced-dice state.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @returns {Promise<void>} Resolves once the original RNG is restored.
 */
export async function resetDice(page) {
   await page.evaluate(() => {
      // Restore only if a stub was installed; otherwise leave the live RNG untouched.
      if (typeof globalThis.__titanOriginalRandomUniform === 'function') {
         CONFIG.Dice.randomUniform = globalThis.__titanOriginalRandomUniform;
      }
      globalThis.__titanForcedQueue = [];
      globalThis.__titanForcedDiceActive = false;
   });
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx playwright test tests/e2e/dice.spec.js --reporter=list`
Expected: PASS — both tests green (Foundry must be on `:30000`, or the Playwright `webServer` launches it).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/dice.js tests/e2e/dice.spec.js
git commit -m "test(check): add deterministic forced-dice seam + guard spec"
```

---

## Task 2: Independent results oracle (`tests/shared/checkOracle.js`) + Vitest validation

**Files:**
- Create: `tests/shared/checkOracle.js`
- Create: `tests/unit/check/check-oracle.test.js`

> The oracle is a standalone reimplementation of the engine's success/crit rules (`src/check/CheckResults.js`), kept separate ON PURPOSE so it is an independent check, not a mirror of the code under test. It assumes `totalExpertise === 0` (faces are final), which is guaranteed by the fixture. It mirrors `expectedSuccesses` in `tests/unit/check/check-test-helpers.js` but additionally returns crits/succeeded/extraSuccesses.

- [ ] **Step 1: Write the failing oracle validation test**

Create `tests/unit/check/check-oracle.test.js`:

```javascript
import { describe, expect, it } from 'vitest';
import { expectedCheckResults } from '../../shared/checkOracle.js';

describe('expectedCheckResults oracle', () => {
   it('counts a crit, a normal success, and a crit failure at difficulty 4, complexity 1', () => {
      const result = expectedCheckResults([6, 4, 1], { difficulty: 4, complexity: 1 });
      expect(result).toEqual({
         successes: 2,
         criticalSuccesses: 1,
         criticalFailures: 1,
         succeeded: true,
         extraSuccesses: 1,
         expertiseRemaining: 0,
      });
   });

   it('treats complexity 0 as never-succeeded (attribute/resistance defaults)', () => {
      const result = expectedCheckResults([6], { difficulty: 4, complexity: 0 });
      expect(result).toEqual({
         successes: 1,
         criticalSuccesses: 1,
         criticalFailures: 0,
         succeeded: false,
         extraSuccesses: 0,
         expertiseRemaining: 0,
      });
   });

   it('honors extraSuccessOnCritical and extraFailureOnCritical flags', () => {
      const result = expectedCheckResults([6, 1], {
         difficulty: 4,
         complexity: 1,
         extraSuccessOnCritical: true,
         extraFailureOnCritical: true,
      });
      // 6 -> +2, 1 -> -1 => successes 1; one crit-success, one crit-failure.
      expect(result).toEqual({
         successes: 1,
         criticalSuccesses: 1,
         criticalFailures: 1,
         succeeded: true,
         extraSuccesses: 0,
         expertiseRemaining: 0,
      });
   });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/check/check-oracle.test.js`
Expected: FAIL — cannot resolve `../../shared/checkOracle.js`.

- [ ] **Step 3: Implement the oracle**

Create `tests/shared/checkOracle.js`:

```javascript
/**
 * Independent oracle for TITAN check results, used by the E2E checks-integration tests.
 *
 * This is a deliberate, standalone reimplementation of the success/crit rules in
 * `src/check/CheckResults.js`; it is NOT imported from the engine, so it can catch an engine
 * regression rather than mirror one. It assumes no expertise was applied (each face is final),
 * which the integration fixture guarantees via `totalExpertise === 0`.
 */

/**
 * Computes the expected check results for a set of final die faces.
 * @param {number[]} faces - The final d6 faces (post-expertise; equal to base when expertise is 0).
 * @param {object} params - The check parameters.
 * @param {number} params.difficulty - The minimum face for a normal success.
 * @param {number} params.complexity - The successes required to succeed (0 means "never succeeded").
 * @param {boolean} [params.extraSuccessOnCritical] - Whether a 6 yields two successes.
 * @param {boolean} [params.extraFailureOnCritical] - Whether a 1 subtracts a success.
 * @returns {{ successes: number, criticalSuccesses: number, criticalFailures: number,
 *   succeeded: boolean, extraSuccesses: number, expertiseRemaining: number }} The expected results.
 */
export function expectedCheckResults(faces, params) {
   // The running tallies mirrored from the engine's per-die classification.
   let successes = 0;
   let criticalSuccesses = 0;
   let criticalFailures = 0;

   // Classify each die exactly once: crit success, normal success, or crit failure.
   for (const face of faces) {
      if (face === 6) {
         criticalSuccesses += 1;
         successes += params.extraSuccessOnCritical ? 2 : 1;
      }
      else if (face >= params.difficulty) {
         successes += 1;
      }
      else if (face === 1) {
         criticalFailures += 1;
         if (params.extraFailureOnCritical) {
            successes -= 1;
         }
      }
   }

   // Resolve success state against complexity (a complexity of 0 can never succeed, per the engine).
   let succeeded = false;
   let extraSuccesses = 0;
   if (params.complexity > 0 && successes >= params.complexity) {
      succeeded = true;
      if (successes > params.complexity) {
         extraSuccesses = successes - params.complexity;
      }
   }

   return {
      successes: successes,
      criticalSuccesses: criticalSuccesses,
      criticalFailures: criticalFailures,
      succeeded: succeeded,
      extraSuccesses: extraSuccesses,
      expertiseRemaining: 0,
   };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/unit/check/check-oracle.test.js`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add tests/shared/checkOracle.js tests/unit/check/check-oracle.test.js
git commit -m "test(check): add independent check-results oracle + validation"
```

---

## Task 3: Lift the E2E Roller fixture into shared builders

**Files:**
- Modify: `tests/shared/builders.js` (append two exported builders)

> Builders return `create`-payloads (the Phase-1 convention). The item-check entry is the full default object from `interaction-rolls.spec.js` (the template module is not importable in-browser), with `attribute`/`skill`/`label`/`difficulty`/`complexity` set for the test. Two `flatModifier` rules elements (`body +2`, `mind +2`) push those attributes to `3` so the body/mind-based checks roll 3 dice. The element shape (`operation`/`selector`/`key`/`value`/`uuid`) matches `buildFlatModifierAbilityData` above it in this file.

- [ ] **Step 1: Add the builders**

Append to `tests/shared/builders.js`:

```javascript
/**
 * Builds the "E2E Roller" actor create-payload: a plain player actor used as the source for every
 * dialog-bypassing `roll<Type>Check` API. Owned items are created separately via
 * {@link buildE2ERollerItemData}.
 * @returns {object} An `Actor.create` payload.
 */
export function buildE2ERollerActorData() {
   return {
      name: 'E2E Roller',
      type: 'player',
   };
}

/**
 * Builds the owned-item create-payloads for the E2E Roller: a weapon (attack check), a spell
 * (casting check), and an ability carrying both an inlined item-check entry (item check) and two
 * flatModifier rules elements that boost Body and Mind by +2 each (so body/mind-based checks roll
 * three dice on a base-1 player). Expertise stays 0 (untrained skills), satisfying the oracle's
 * no-expertise assumption.
 * @returns {object[]} An array of `Item.create` payloads (weapon, spell, ability).
 */
export function buildE2ERollerItemData() {
   return [
      {
         name: 'E2E Weapon',
         type: 'weapon',
      },
      {
         name: 'E2E Spell',
         type: 'spell',
      },
      {
         name: 'E2E Ability',
         type: 'ability',
         system: {
            // A COMPLETE item-check entry mirroring createItemCheckTemplate()
            // (src/check/types/item-check/ItemCheckTemplate.js); omitting fields like opposedCheck
            // makes getItemCheckParameters throw. attribute/skill/label/difficulty/complexity are
            // set for the test; the rest hold template defaults.
            check: [
               {
                  attribute: 'body',
                  complexity: 1,
                  damageReducedBy: 'none',
                  difficulty: 4,
                  initialValue: 1,
                  isDamage: false,
                  isHealing: false,
                  label: 'E2E Check',
                  opposedCheck: {
                     attribute: 'body',
                     enabled: false,
                     skill: 'athletics',
                  },
                  resistanceCheck: 'none',
                  resolveCost: 0,
                  scaling: true,
                  skill: 'arcana',
                  uuid: 'e2e0e2e0-e2e0-4e2e-8e2e-e2e0e2e0e2e0',
               },
            ],
            // Boost Body and Mind to 3 so attribute/attack/casting/item checks roll three dice.
            rulesElement: [
               {
                  operation: 'flatModifier',
                  selector: 'attribute',
                  key: 'body',
                  value: 2,
                  uuid: 'e2e-roller-body-0',
               },
               {
                  operation: 'flatModifier',
                  selector: 'attribute',
                  key: 'mind',
                  value: 2,
                  uuid: 'e2e-roller-mind-0',
               },
            ],
         },
      },
   ];
}
```

- [ ] **Step 2: Verify the module still parses (no test yet — exercised by Task 4)**

Run: `node --check tests/shared/builders.js`
Expected: no output, exit 0 (syntax valid).

- [ ] **Step 3: Commit**

```bash
git add tests/shared/builders.js
git commit -m "test(check): add E2E Roller actor/item builders for checks-integration"
```

---

## Task 4: Forced-dice checks-integration spec (the five tests)

**Files:**
- Create: `tests/e2e/checks-integration.spec.js`

> Per check type: rebuild the roller, force `[6,4,1]`, roll, then read `flags.titan.parameters` and `flags.titan.results`. Assert (a) parameters were assembled from the actor (`totalDice`, `difficulty`, `complexity`, `totalExpertise`), (b) the forced faces plumbed into `results.dice[].base` (sorted desc, truncated to `totalDice`), and (c) results equal the independent oracle — exactly.

- [ ] **Step 1: Write the spec (initially failing)**

Create `tests/e2e/checks-integration.spec.js`:

```javascript
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { forceDice, resetDice } from './dice.js';
import { buildE2ERollerActorData, buildE2ERollerItemData } from '../shared/builders.js';
import { expectedCheckResults } from '../shared/checkOracle.js';

/**
 * 2b-2 checks-integration: for each dialog-bypassing `roll<Type>Check` API, force a known dice
 * sequence and assert that (1) the parameters were assembled from the actor, (2) the forced dice
 * plumbed into `flags.titan.results.dice`, and (3) the results match an independent oracle exactly.
 * The fixture rolls every check at `totalExpertise === 0`, so each die's `final` equals its `base`.
 */

// The forced faces every test uses; a 3-dice check consumes all, the 1-die resistance check uses one.
const FORCED_FACES = [6, 4, 1];

// Per-check expectations for the E2E Roller fixture (see plan's fixture table for derivations).
const CHECK_CASES = [
   {
      name: 'attribute',
      expectedType: 'attributeCheck',
      invoke: 'await actor.system.rollAttributeCheck({ attribute: "body" });',
      expectedTotalDice: 3,
      expectedDifficulty: 4,
      expectedComplexity: 0,
   },
   {
      name: 'resistance',
      expectedType: 'resistanceCheck',
      invoke: 'await actor.system.rollResistanceCheck({ resistance: "resilience" });',
      expectedTotalDice: 1,
      expectedDifficulty: 4,
      expectedComplexity: 0,
   },
   {
      name: 'attack',
      expectedType: 'attackCheck',
      invoke: 'await actor.system.rollAttackCheck({ itemId: fixtures.weaponId, attackIdx: 0 });',
      expectedTotalDice: 3,
      expectedDifficulty: 4,
      expectedComplexity: 1,
   },
   {
      name: 'casting',
      expectedType: 'castingCheck',
      invoke: 'await actor.system.rollCastingCheck({ itemId: fixtures.spellId });',
      expectedTotalDice: 3,
      expectedDifficulty: 4,
      expectedComplexity: 1,
   },
   {
      name: 'item',
      expectedType: 'itemCheck',
      invoke: 'await actor.system.rollItemCheck({ itemId: fixtures.abilityId, checkIdx: 0 });',
      expectedTotalDice: 3,
      expectedDifficulty: 4,
      expectedComplexity: 1,
   },
];

test.describe('v14 checks integration (forced dice)', () => {
   // Resolves the roller actor inside the world.
   const ACTOR_LOCATE = '() => game.actors.getName("E2E Roller")';

   // Log in and (re)build the roller fixture from the shared builders before each test.
   test.beforeEach(async ({ page }) => {
      await login(page);

      // Precondition: the TITAN system must have initialized.
      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(systemReady, 'TITAN system failed to initialize before checks-integration walk').toBe(true);

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

   // Always restore the RNG, even if a test fails mid-roll.
   test.afterEach(async ({ page }) => {
      await resetDice(page);
   });

   for (const checkCase of CHECK_CASES) {
      test(`${checkCase.name} check assembles parameters and plumbs forced dice`, async ({ page }) => {
         // Capture uncaught errors during the roll/render window.
         const errors = [];
         page.on('pageerror', (err) => {
            errors.push(err.message);
         });

         // Force the known dice sequence immediately before rolling.
         await forceDice(page, FORCED_FACES);

         // Roll inside the world and report the new message's flags.
         const flags = await page.evaluate(async ({ actorLocate, invokeSrc }) => {
            const actor = new Function(`return (${actorLocate})()`)();
            const fixtures = {
               weaponId: actor.items.find((i) => i.type === 'weapon')?.id,
               spellId: actor.items.find((i) => i.type === 'spell')?.id,
               abilityId: actor.items.find((i) => i.type === 'ability')?.id,
            };

            const before = game.messages.size;
            await new Function('actor', 'fixtures', `return (async () => { ${invokeSrc} })();`)(actor, fixtures);
            await new Promise((resolve) => {
               setTimeout(resolve, 300);
            });

            const newest = game.messages.contents[game.messages.size - 1];
            return {
               created: game.messages.size > before,
               type: newest?.flags?.titan?.type,
               parameters: newest?.flags?.titan?.parameters,
               results: newest?.flags?.titan?.results,
            };
         }, { actorLocate: ACTOR_LOCATE, invokeSrc: checkCase.invoke });

         // (0) A message of the right type was created.
         expect(flags.created, 'a chat message was created').toBe(true);
         expect(flags.type, 'flags.titan.type').toBe(checkCase.expectedType);

         // (1) Parameters were assembled from the actor.
         expect(flags.parameters.totalDice, 'totalDice from actor').toBe(checkCase.expectedTotalDice);
         expect(flags.parameters.difficulty, 'difficulty from actor/item').toBe(checkCase.expectedDifficulty);
         expect(flags.parameters.complexity, 'complexity from actor/item').toBe(checkCase.expectedComplexity);
         expect(flags.parameters.totalExpertise, 'totalExpertise is zero (untrained)').toBe(0);

         // (2) The forced dice plumbed through: results.dice[].base == forced faces, sorted desc,
         // truncated to the number of dice actually rolled.
         const consumedFaces = FORCED_FACES.slice(0, checkCase.expectedTotalDice)
            .slice()
            .sort((a, b) => b - a);
         const actualBases = flags.results.dice.map((die) => die.base);
         expect(actualBases, 'rolled dice bases match forced faces').toEqual(consumedFaces);

         // With zero expertise, finals equal bases.
         const actualFinals = flags.results.dice.map((die) => die.final);
         expect(actualFinals, 'finals equal bases at zero expertise').toEqual(consumedFaces);

         // (3) Results equal the independent oracle, exactly.
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
         expect(flags.results.expertiseRemaining, 'expertiseRemaining').toBe(expected.expertiseRemaining);

         // No uncaught errors during the roll.
         expect(errors, `uncaught errors during ${checkCase.name} roll:\n${errors.join('\n')}`).toEqual([]);
      });
   }
});
```

- [ ] **Step 2: Run it to verify it passes**

Run: `npx playwright test tests/e2e/checks-integration.spec.js --reporter=list`
Expected: PASS — 5 tests green.

If a test fails on `totalDice`/`difficulty`/`complexity`, the failure is a genuine finding: either (a) a parameter-assembly assumption in the fixture table is wrong (re-derive from source and correct the `expected*` constant — do NOT loosen the assertion), or (b) a real plumbing bug in the roll API (apply the systematic-debugging skill, fix at root, add the finding to the status doc's "Bugs found & fixed" list). Forced-dice mismatches in `results.dice[].base` indicate the RNG stub is being bypassed — verify `forceDice` ran before the roll and no intervening `randomUniform` consumer exists.

- [ ] **Step 3: Run the full E2E + unit suites for no regressions**

Run: `npx vitest run`
Expected: PASS — 35 tests (32 prior + 3 new oracle tests).

Run: `npx playwright test tests/e2e/render-smoke.spec.js tests/e2e/logic tests/e2e/trait-add-custom.spec.js tests/e2e/interaction-rolls.spec.js tests/e2e/dice.spec.js tests/e2e/checks-integration.spec.js --reporter=list`
Expected: PASS — all green (interaction-rolls untouched and still passing alongside the new spec).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/checks-integration.spec.js
git commit -m "test(check): forced-dice integration for all five roll<Type>Check APIs"
```

---

## Task 5: Update the status doc + titan-codebase skill, then close out

**Files:**
- Modify: `docs/superpowers/e2e-suite-status.md`
- Modify (if a gap/stale fact surfaced): `.claude/skills/titan-codebase/references/*.md`

- [ ] **Step 1: Mark 2b-2 done in the status doc**

In `docs/superpowers/e2e-suite-status.md`:
- Move the **2b-2 checks-integration** entry from "NEXT" into "Done" with a one-line summary: forced-dice seam (`tests/e2e/dice.js`), independent oracle (`tests/shared/checkOracle.js`), shared roller builders, and `tests/e2e/checks-integration.spec.js` (5 tests, exact parameters + results).
- Update the header **Next action** to **2b-3 checks-dialog**.
- Update the "How to verify current state quickly on resume" counts: `npx vitest run` → 35 passing; add `tests/e2e/checks-integration.spec.js` and `tests/e2e/dice.spec.js` to the playwright verify command.
- If any real bug was found in Task 4, add it to "Bugs found & fixed (by this testing effort)".

- [ ] **Step 2: Reconcile the titan-codebase skill (self-update protocol)**

Per the titan-codebase skill's self-update protocol: if implementing this plan required reading code that the skill's references should have told you (e.g. the `_initializeAttributeBasedCheck` derivation, the attack-difficulty formula, the resistance-from-baseValue coupling, or the `CONFIG.Dice.randomUniform` seam), add a concise, verified line to the right `references/*.md` file (likely `data-flow.md` for the check-parameter assembly). Report exactly what was added/changed in the final message.

- [ ] **Step 3: Commit the docs/skill updates**

```bash
git add docs/superpowers/e2e-suite-status.md .claude/skills/titan-codebase
git commit -m "docs: mark 2b-2 checks-integration done; next 2b-3 checks-dialog"
```

- [ ] **Step 4: Update auto-memory**

Update `C:\Users\emper\.claude\projects\C--FoundryVTT-V14-dev-foundryuserdata-Data-systems-titan\memory\e2e-suite-progress.md` so the "Next action" reads **2b-3 checks-dialog**, keeping the committed status doc as the source of truth.

---

## Self-review (run against this plan before execution)

1. **Spec coverage** — the 2b-2 goal ("each `roll<Type>Check` assembles parameters from the actor and plumbs results into `flags.titan`") is covered by Task 4's per-type parameter assertions (assembly) + dice-base/results assertions (plumbing). All five check types are present in `CHECK_CASES`. ✓
2. **Placeholder scan** — every code step contains complete code; commands have expected output; no "TBD"/"handle edge cases". ✓
3. **Type consistency** — helper names (`forceDice`/`resetDice`, `expectedCheckResults`, `buildE2ERollerActorData`/`buildE2ERollerItemData`), the `globalThis.__titanForcedQueue`/`__titanOriginalRandomUniform`/`__titanForcedDiceActive` globals, and the `flags.titan.{type,parameters,results}` shape are used identically across Tasks 1–4. The oracle's return shape matches the fields asserted in Task 4. ✓
4. **Assumptions to verify at runtime** — the fixture table's dice counts depend on rules-element boosts applying on ownership and resistances deriving from baseValue (so resilience stays 1). Task 4 Step 2 surfaces any mismatch as a fix-it-now finding, not a silent loosening. ✓
