# 2b-4 Checks-Opposed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Per the project `.claude/CLAUDE.md`, route ALL `.js` work through the `titan-svelte-dev` subagent.

**Goal:** Prove TITAN's two opposed check mechanics end-to-end in Playwright — attack difficulty derived from a target's Defense rating, and resistance `damageTaken` reduced by successes against incoming damage.

**Architecture:** Drive the existing dialog-bypassing `rollAttackCheck` / `rollResistanceCheck` APIs (both reach the opposed code paths). For attack-vs-Defense, skip the canvas entirely: temporarily reassign `game.user.targets` to a fake `Set` of `{ actor }` entries (the exact shape `getTargetedCharacters()` reads), restoring it in a `finally`. For resistance-vs-damage, pass `damageToReduce` as the explicit option the Resist button uses. Force dice for determinism and read all assertion inputs (`targetDefense`, `attackerRating`, `difficulty`, `complexity`) from `flags.titan.parameters` so nothing hardcodes a rating formula.

**Tech Stack:** Playwright (live Foundry v14 on `:30000`, auto-launched by the test `webServer`), the existing `forceDice`/`resetDice` helpers, the `expectedCheckResults` oracle, and the shared create-payload builders.

**Nature of these tests:** They characterize *existing* engine behavior, so each test is expected to **PASS** once written correctly. A genuine failure means either a test-logic bug or a real engine bug — in the latter case stop and invoke `superpowers:systematic-debugging` (this is how 2b-2/2b-3 found their bugs), do not loosen the assertion.

---

## Key engine facts (confirmed against source)

- `getTargetedCharacters()` (`src/helpers/utility-functions/GetTargetedCharacters.js`) →
  `getTargetedTokens()` → `Array.from(game.user.targets)`; filters `target.actor?.system.isCharacter`;
  returns `target.actor[]`. As GM with an empty target set it falls back to `getControlledTokens()` (empty
  with no drawn canvas), so an empty fake set yields the unopposed fallback.
- `initializeAttackCheckOptions` (`CharacterDataModel.js:2317`), lines 2497-2508: when
  `options.targetDefense === undefined`, sets `targetDefense = targets[0].system.getRollData().rating.defense.value`
  if a target exists, else falls back to `attackerMelee` (melee) / `attackerAccuracy` (ranged).
- `rollAttackCheck` (`:2209`) calls `initializeAttackCheckOptions` at `:2219` — the bypass API reaches the
  auto-populate without a dialog.
- `getAttackCheckParameters` (`:2681`) computes `difficulty = clamp(targetDefense − attackerRating + 4, 2, 6)`
  (`:2711`). `AttackCheckParameters` carries `targetDefense`, `attackerRating`, `attackerMelee`,
  `attackerAccuracy`, `difficulty`, `type` (all serialized into `flags.titan.parameters`).
- `User#targets` is a plain own data-property (assigned in the User constructor), not a getter — safely
  reassignable, restore in a `finally`.
- Rating value math: `applyMods` does `stat.value = Math.max(stat.value + mod, 0)` (`:1627`) — **floored at 0**.
  A plain character's base ratings are 1 (`ceil((1 + 0) / 2)`), so a defense flat-modifier of −8 floors the
  target Defense to 0; with the roller's attack rating boosted to 6 (base 1 + flat 5), the lower clamp
  (`clamp(0 − 6 + 4) = 2`) becomes reachable. Without the boost the lower clamp is unreachable.
- `selector: 'rating'` flat-modifiers land on `this.rating[key].mod` (`:938-940`), so `rating`/`defense`,
  `rating`/`melee`, `rating`/`accuracy` are all valid offsets. Abilities apply rules elements on ownership.
- Resistance: `ResistanceCheckOptions` declares `damageToReduce` (default 0); `calculateResistanceCheckResults`
  (`ResistanceCheckResults.js:31`) sets `damageTaken = damageToReduce && !succeeded ? damageToReduce − successes : 0`.
  The Resist button (`ResistanceCheckButton.svelte`) passes `{ resistance, difficulty, complexity, damageToReduce }`
  into `requestResistanceCheck` → `rollResistanceCheck`. `expectedCheckResults` treats `complexity === 0` as
  never-succeeded, so Part B passes an explicit `complexity`.
- The roller's resilience resistance rolls exactly **1** die (resistances derive from attribute baseValues,
  unaffected by the roller's body/mind flat-modifiers) — forcing `[4]` controls it fully.

### Fixture arithmetic (all deterministic)

Roller attack rating `R = max(1 + 5, 0) = 6` (base 1 + `ATTACKER_BOOST` 5; `_getAttackRatingMod` is 0 for
the plain E2E Weapon). Target base Defense = 1.

| Target defense mod | Defense value | `raw = def − 6 + 4` | difficulty |
|---|---|---|---|
| +6 | `max(1+6,0)=7` | 5 | 5 (interior) |
| +8 | `max(1+8,0)=9` | 7 | 6 (clamp high) |
| −8 | `max(1−8,0)=0` | −2 | 2 (clamp low) |
| (none) | fallback → R = 6 | 4 | 4 (fallback) |

Tests read `attackerRating`/`targetDefense` from `flags` and recompute the expected difficulty, and assert
the raw value is genuinely out of `[2,6]` for the clamp cases — so the assertions stay valid even if the
fixture math ever drifts.

---

## File structure

- `tests/shared/builders.js` — **modify** (append 3 functions): `buildE2ETargetActorData`,
  `buildE2ETargetDefenseItemData`, `buildE2EAttackerRatingItemData`. (Do **not** touch the existing
  `buildE2ERoller*` functions — 2b-2/2b-3 depend on them unchanged.)
- `tests/e2e/checks-opposed.spec.js` — **create**: one `describe` with a shared `beforeEach` (rebuilds the
  roller + boost + three target actors) and `afterEach` (`resetDice`); 4 Part A tests + 2 Part B tests.
- `docs/superpowers/e2e-suite-status.md` — **modify**: mark 2b-4 done, set the next action.
- Memory `e2e-suite-progress.md` + `MEMORY.md` — **modify**: advance the resume pointer.

---

## Task 1: Target / attacker-boost builders

**Files:**
- Modify: `tests/shared/builders.js` (append at end of file)

- [ ] **Step 1: Append the three builder functions**

Add to the end of `tests/shared/builders.js`:

```js
/**
 * Builds a plain target character (player) create-payload used as an attack target. Its Defense
 * flat modifier is supplied separately by {@link buildE2ETargetDefenseItemData}.
 * @param {string} name - The actor name.
 * @returns {object} An `Actor.create` payload.
 */
export function buildE2ETargetActorData(name) {
   return {
      name: name,
      type: 'player',
   };
}

/**
 * Builds an ability item create-payload carrying a single flatModifier rules element on the Defense
 * rating, so an owned copy shifts the target's `rating.defense.value` by a known amount. Abilities
 * apply their rules elements on mere ownership, with no equip required.
 * @param {number} defenseMod - The flat modifier applied to the Defense rating; may be negative.
 * @returns {object} An `Item.create` payload of type `ability`.
 */
export function buildE2ETargetDefenseItemData(defenseMod) {
   return {
      name: `E2E Defense ${defenseMod}`,
      type: 'ability',
      system: {
         rulesElement: [
            {
               operation: 'flatModifier',
               selector: 'rating',
               key: 'defense',
               value: defenseMod,
               uuid: `e2e-target-def-${defenseMod}`,
            },
         ],
      },
   };
}

/**
 * Builds an ability item create-payload that boosts the owner's Melee and Accuracy attack ratings by a
 * fixed amount, so an attacker's rating is high enough for the difficulty clamp to reach its lower
 * bound. Targets the `rating` selector for both keys, so the weapon's attack type is irrelevant.
 * @param {number} value - The flat modifier applied to both the Melee and Accuracy ratings.
 * @returns {object} An `Item.create` payload of type `ability`.
 */
export function buildE2EAttackerRatingItemData(value) {
   return {
      name: 'E2E Attacker Boost',
      type: 'ability',
      system: {
         rulesElement: [
            {
               operation: 'flatModifier',
               selector: 'rating',
               key: 'melee',
               value: value,
               uuid: 'e2e-attacker-melee',
            },
            {
               operation: 'flatModifier',
               selector: 'rating',
               key: 'accuracy',
               value: value,
               uuid: 'e2e-attacker-accuracy',
            },
         ],
      },
   };
}
```

- [ ] **Step 2: Lint-check the edited file builds**

Run: `npx eslint tests/shared/builders.js`
Expected: no errors (matches the existing builder style — 120-col wrap, typed JSDoc).

- [ ] **Step 3: Commit**

```bash
git add tests/shared/builders.js
git commit -m "test(builders): add opposed-check target + attacker-rating fixtures"
```

---

## Task 2: Part A — attack vs Defense (4 tests)

**Files:**
- Create: `tests/e2e/checks-opposed.spec.js`

- [ ] **Step 1: Write the spec file (header, helpers, beforeEach/afterEach, 4 Part A tests)**

Create `tests/e2e/checks-opposed.spec.js` with exactly this content:

```js
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { forceDice, resetDice } from './dice.js';
import {
   buildE2EAttackerRatingItemData,
   buildE2ERollerActorData,
   buildE2ERollerItemData,
   buildE2ETargetActorData,
   buildE2ETargetDefenseItemData,
} from '../shared/builders.js';
import { expectedCheckResults } from '../shared/checkOracle.js';

/**
 * 2b-4 checks-opposed: prove the two opposed mechanics through the dialog-bypassing roll APIs.
 * Part A (attack vs Defense) feeds a fake `game.user.targets` set so `targetDefense` auto-populates
 * from the target; Part B (resistance vs damage) passes `damageToReduce` like the Resist button.
 */

// The forced faces every attack roll uses; the roller's attack rolls three dice.
const FORCED_FACES = [6, 4, 1];

// Flat boost to the roller's Melee and Accuracy ratings so the difficulty clamp can reach BOTH bounds
// (a plain attacker's rating of 1 cannot drive the lower clamp, because Defense floors at 0).
const ATTACKER_BOOST = 5;

// The target Defense flat modifiers pre-created in the world (interior, clamp-high, clamp-low).
const TARGET_MODS = [6, 8, -8];

/**
 * Resolves a target actor's world name for a given Defense flat modifier.
 * @param {number} mod - The Defense flat modifier.
 * @returns {string} The actor name used in the world.
 */
function targetName(mod) {
   return `E2E Target ${mod >= 0 ? '+' : ''}${mod}`;
}

/**
 * Mirrors the engine's difficulty clamp: clamp(targetDefense - attackerRating + 4, 2, 6).
 * @param {number} targetDefense - The target's Defense rating.
 * @param {number} attackerRating - The attacker's attack rating.
 * @returns {number} The expected difficulty.
 */
function expectedDifficulty(targetDefense, attackerRating) {
   return Math.min(6, Math.max(2, targetDefense - attackerRating + 4));
}

/**
 * Rolls the roller's weapon attack against a fake target set built from the named target actors
 * (empty when `targetNames` is empty), forcing FORCED_FACES, and returns the new message's flags plus
 * the live-read Defense ratings of the named targets. Restores `game.user.targets` in a `finally`.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @param {string[]} targetNames - The world names of the target actors to put in `game.user.targets`.
 * @returns {Promise<object>} `{ created, parameters, results, targetDefenses }`.
 */
async function rollAttackWithTargets(page, targetNames) {
   await forceDice(page, FORCED_FACES);
   return page.evaluate(async (names) => {
      const roller = game.actors.getName('E2E Roller');
      const weaponId = roller.items.find((item) => item.type === 'weapon').id;

      // The fake target set carries exactly what getTargetedCharacters() reads: `.actor`.
      const targetActors = names.map((name) => game.actors.getName(name));
      const fakeTargets = new Set(targetActors.map((actor) => ({ actor })));

      const original = game.user.targets;
      const before = game.messages.size;
      let parameters;
      let results;
      try {
         game.user.targets = fakeTargets;
         await roller.system.rollAttackCheck({ itemId: weaponId, attackIdx: 0 });
         await new Promise((resolve) => {
            setTimeout(resolve, 300);
         });
         const newest = game.messages.contents[game.messages.size - 1];
         parameters = newest?.flags?.titan?.parameters;
         results = newest?.flags?.titan?.results;
      }
      finally {
         game.user.targets = original;
      }

      return {
         created: game.messages.size > before,
         parameters: parameters,
         results: results,
         targetDefenses: targetActors.map((actor) => actor.system.getRollData().rating.defense.value),
      };
   }, targetNames);
}

test.describe('v14 opposed checks (forced dice)', () => {

   // Rebuild the roller (with the attack-rating boost) and the three target actors before each test.
   test.beforeEach(async ({ page }) => {
      await login(page);

      // Precondition: the TITAN system must have initialized.
      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(systemReady, 'TITAN system failed to initialize before opposed-checks walk').toBe(true);

      await page.evaluate(async ({ rollerActor, rollerItems, attackerBoostItem, targets }) => {
         // Rebuild the roller with a boosted attack rating so both difficulty clamps are reachable.
         const staleRoller = game.actors.getName('E2E Roller');
         if (staleRoller) {
            await staleRoller.delete();
         }
         const roller = await Actor.create(rollerActor);
         await roller.createEmbeddedDocuments('Item', [...rollerItems, attackerBoostItem]);

         // Rebuild each target actor carrying its Defense flat-modifier ability.
         for (const target of targets) {
            const stale = game.actors.getName(target.actor.name);
            if (stale) {
               await stale.delete();
            }
            const actor = await Actor.create(target.actor);
            await actor.createEmbeddedDocuments('Item', [target.item]);
         }
      }, {
         rollerActor: buildE2ERollerActorData(),
         rollerItems: buildE2ERollerItemData(),
         attackerBoostItem: buildE2EAttackerRatingItemData(ATTACKER_BOOST),
         targets: TARGET_MODS.map((mod) => ({
            actor: buildE2ETargetActorData(targetName(mod)),
            item: buildE2ETargetDefenseItemData(mod),
         })),
      });
   });

   // Always restore the RNG, even if a test fails mid-roll.
   test.afterEach(async ({ page }) => {
      await resetDice(page);
   });

   test('targeted attack derives difficulty from the target Defense (interior)', async ({ page }) => {
      const flags = await rollAttackWithTargets(page, [targetName(6)]);

      expect(flags.created, 'an attack message was created').toBe(true);

      const targetDefense = flags.targetDefenses[0];
      const { attackerRating, difficulty } = flags.parameters;

      // The target path populated targetDefense from the target, not the attacker fallback.
      expect(flags.parameters.targetDefense, 'targetDefense read from target').toBe(targetDefense);
      expect(targetDefense, 'target Defense differs from the attacker rating').not.toBe(attackerRating);

      // The difficulty follows the clamp formula and lands strictly inside the band (interior).
      const raw = targetDefense - attackerRating + 4;
      expect(raw, 'interior case is not clamped (above lower bound)').toBeGreaterThan(2);
      expect(raw, 'interior case is not clamped (below upper bound)').toBeLessThan(6);
      expect(difficulty, 'difficulty = clamp(targetDefense - attackerRating + 4, 2, 6)')
         .toBe(expectedDifficulty(targetDefense, attackerRating));

      // The full results pipeline still holds at this non-4 difficulty.
      const expected = expectedCheckResults([...FORCED_FACES].sort((a, b) => b - a), {
         difficulty: difficulty,
         complexity: flags.parameters.complexity,
         extraSuccessOnCritical: flags.parameters.extraSuccessOnCritical,
         extraFailureOnCritical: flags.parameters.extraFailureOnCritical,
      });
      expect(flags.results.successes, 'successes').toBe(expected.successes);
      expect(flags.results.succeeded, 'succeeded').toBe(expected.succeeded);
      expect(flags.results.criticalSuccesses, 'criticalSuccesses').toBe(expected.criticalSuccesses);
      expect(flags.results.criticalFailures, 'criticalFailures').toBe(expected.criticalFailures);
      expect(flags.results.extraSuccesses, 'extraSuccesses').toBe(expected.extraSuccesses);
   });

   test('attack difficulty clamps to both bounds (2 and 6)', async ({ page }) => {
      // High bound: a far-above-attacker Defense pins the difficulty to 6.
      const high = await rollAttackWithTargets(page, [targetName(8)]);
      const highDefense = high.targetDefenses[0];
      const highRaw = highDefense - high.parameters.attackerRating + 4;
      expect(highRaw, 'high case exceeds the upper bound before clamping').toBeGreaterThan(6);
      expect(high.parameters.difficulty, 'difficulty clamps to 6').toBe(6);

      // Low bound: a floored (0) Defense against the boosted attacker pins the difficulty to 2.
      const low = await rollAttackWithTargets(page, [targetName(-8)]);
      const lowDefense = low.targetDefenses[0];
      const lowRaw = lowDefense - low.parameters.attackerRating + 4;
      expect(lowRaw, 'low case falls below the lower bound before clamping').toBeLessThan(2);
      expect(low.parameters.difficulty, 'difficulty clamps to 2').toBe(2);
   });

   test('with multiple targets the first target Defense is used', async ({ page }) => {
      const flags = await rollAttackWithTargets(page, [targetName(6), targetName(8)]);
      const [firstDefense, secondDefense] = flags.targetDefenses;

      expect(firstDefense, 'fixture targets have distinct Defense').not.toBe(secondDefense);
      expect(flags.parameters.targetDefense, 'targetDefense uses the first target').toBe(firstDefense);
      expect(flags.parameters.difficulty, 'difficulty derives from the first target')
         .toBe(expectedDifficulty(firstDefense, flags.parameters.attackerRating));
   });

   test('with no target the attack falls back to the attacker rating (difficulty 4)', async ({ page }) => {
      const flags = await rollAttackWithTargets(page, []);

      expect(flags.created, 'an attack message was created').toBe(true);
      expect(flags.parameters.targetDefense, 'targetDefense falls back to the attacker rating')
         .toBe(flags.parameters.attackerRating);
      expect(flags.parameters.difficulty, 'fallback difficulty is the unopposed 4').toBe(4);
   });
});
```

- [ ] **Step 2: Run the Part A tests**

Run: `npx playwright test tests/e2e/checks-opposed.spec.js --reporter=list`
Expected: 4 passed. (Foundry auto-launches via the test `webServer` if not already on `:30000`.)
If any test FAILS: do not loosen assertions — invoke `superpowers:systematic-debugging`; a real failure here is an engine bug worth reporting (compare to the live values in `flags.titan.parameters`).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/checks-opposed.spec.js
git commit -m "test(check): drive attack-vs-Defense opposed difficulty via a fake target set"
```

---

## Task 3: Part B — resistance vs damage (2 tests)

**Files:**
- Modify: `tests/e2e/checks-opposed.spec.js` (add two tests inside the existing `describe`, before its
  closing `});`)

- [ ] **Step 1: Add the two resistance tests**

Insert these two tests immediately after the "with no target …" test, still inside the
`test.describe('v14 opposed checks (forced dice)', …)` block:

```js
   test('failed resistance reduces incoming damage by the successes rolled', async ({ page }) => {
      // One resilience die forced to a success (face 4 >= difficulty 4); complexity 2 leaves the check
      // one success short, so it fails and reduces the incoming damage by the successes rolled.
      await forceDice(page, [4]);
      const flags = await page.evaluate(async () => {
         const roller = game.actors.getName('E2E Roller');
         const before = game.messages.size;
         await roller.system.rollResistanceCheck({
            resistance: 'resilience',
            difficulty: 4,
            complexity: 2,
            damageToReduce: 5,
         });
         await new Promise((resolve) => {
            setTimeout(resolve, 300);
         });
         const newest = game.messages.contents[game.messages.size - 1];
         return {
            created: game.messages.size > before,
            parameters: newest?.flags?.titan?.parameters,
            results: newest?.flags?.titan?.results,
         };
      });

      expect(flags.created, 'a resistance message was created').toBe(true);
      expect(flags.results.dice.length, 'resilience rolls a single die').toBe(1);

      const oracle = expectedCheckResults([4], {
         difficulty: 4,
         complexity: 2,
         extraSuccessOnCritical: flags.parameters.extraSuccessOnCritical,
         extraFailureOnCritical: flags.parameters.extraFailureOnCritical,
      });
      expect(flags.results.successes, 'one forced success').toBe(1);
      expect(oracle.succeeded, 'oracle: 1 success < complexity 2 fails').toBe(false);
      expect(flags.results.succeeded, 'engine: the resist failed').toBe(false);

      // damageTaken = damageToReduce - successes when the resist fails.
      expect(flags.results.damageTaken, 'damageTaken = 5 - successes').toBe(5 - flags.results.successes);
   });

   test('successful resistance takes no damage', async ({ page }) => {
      // One resilience die forced to a success; complexity 1 means the single success succeeds, so no
      // damage is taken even though damage was incoming.
      await forceDice(page, [4]);
      const flags = await page.evaluate(async () => {
         const roller = game.actors.getName('E2E Roller');
         const before = game.messages.size;
         await roller.system.rollResistanceCheck({
            resistance: 'resilience',
            difficulty: 4,
            complexity: 1,
            damageToReduce: 5,
         });
         await new Promise((resolve) => {
            setTimeout(resolve, 300);
         });
         const newest = game.messages.contents[game.messages.size - 1];
         return {
            created: game.messages.size > before,
            results: newest?.flags?.titan?.results,
         };
      });

      expect(flags.created, 'a resistance message was created').toBe(true);
      expect(flags.results.succeeded, 'check succeeded (1 success >= complexity 1)').toBe(true);
      expect(flags.results.damageTaken, 'no damage taken on a successful resist').toBe(0);
   });
```

- [ ] **Step 2: Run the full opposed spec**

Run: `npx playwright test tests/e2e/checks-opposed.spec.js --reporter=list`
Expected: 6 passed.
If a resistance test FAILS on `dice.length`: the resilience die count assumption is wrong — read the live
`flags.titan.parameters.totalDice` and adjust the forced-faces array (and the oracle input) to match,
keeping `successes`/`succeeded` controlled. Otherwise invoke `superpowers:systematic-debugging`.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/checks-opposed.spec.js
git commit -m "test(check): resistance-vs-damage reduces damageTaken by successes"
```

---

## Task 4: Regression sweep + status/memory update

**Files:**
- Modify: `docs/superpowers/e2e-suite-status.md`
- Modify: memory `e2e-suite-progress.md` and `MEMORY.md`

- [ ] **Step 1: Run the unit suite (must be unchanged)**

Run: `npx vitest run`
Expected: 35 passed (no new unit tests added).

- [ ] **Step 2: Run the full Playwright regression**

Run: `npx playwright test tests/e2e/render-smoke.spec.js tests/e2e/logic tests/e2e/trait-add-custom.spec.js tests/e2e/interaction-rolls.spec.js tests/e2e/interaction-dialogs.spec.js tests/e2e/dice.spec.js tests/e2e/checks-integration.spec.js tests/e2e/checks-dialog.spec.js tests/e2e/checks-opposed.spec.js --reporter=list`
Expected: 46 passed (the prior 40 + the 6 new). No `pageerror` reported.

- [ ] **Step 3: Update the status doc**

In `docs/superpowers/e2e-suite-status.md`: move 2b-4 from "NEXT" into "Done" with a one-paragraph summary
(fake-target-set via `game.user.targets` reassignment; attack-rating boost to reach both difficulty clamps;
resistance `damageToReduce` path). Replace the "NEXT" section with **Phase 3 (UI component/manifest tiers)**.
Update the "How to verify" Playwright line to include `tests/e2e/checks-opposed.spec.js` and bump the count
to 46.

- [ ] **Step 4: Update memory**

In `memory/e2e-suite-progress.md` and the `MEMORY.md` index line: change the resume pointer from
"2b-4 checks-opposed" to "Phase 3 UI tiers", noting 2b-4 is complete (all of concern 4 — both attack-vs-Defense
and resistance-vs-damage — is done).

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/e2e-suite-status.md
git commit -m "docs(e2e): mark 2b-4 checks-opposed done; next Phase 3 UI tiers"
```

---

## Self-review

- **Spec coverage:** Part A interior (test 1), clamp both bounds (test 2), first-target-wins (test 3),
  no-target fallback (test 4); Part B failed-resist (test 5), successful-resist (test 6) — all six spec
  tests mapped. Builders for target actor + Defense offset + attacker boost (Task 1). Verification +
  status/memory (Task 4). No spec requirement left unimplemented (canvas/dialog/melee-matrix are explicitly
  out of scope per the spec).
- **Placeholders:** none — every step has complete code or an exact command + expected output.
- **Type/name consistency:** `buildE2ETargetActorData` / `buildE2ETargetDefenseItemData` /
  `buildE2EAttackerRatingItemData`, `targetName`, `expectedDifficulty`, `rollAttackWithTargets`,
  `ATTACKER_BOOST`, `TARGET_MODS`, `FORCED_FACES` are defined once and used consistently; the import block in
  the spec matches the three new builder exports plus the existing `buildE2ERoller*` and `expectedCheckResults`.
