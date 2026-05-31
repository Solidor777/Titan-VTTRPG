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
});
