import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';
import { readNewestCheckFlags } from './checkDialog.js';
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

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('v14 checks integration (forced dice)', () => {
   // Resolves the roller actor inside the world.
   const ACTOR_LOCATE = '() => game.actors.getName("E2E Roller")';

   // (Re)build the roller fixture from the shared builders before each test.
   test.beforeEach(async () => {
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
   test.afterEach(async () => {
      await resetDice(page);
   });

   for (const checkCase of CHECK_CASES) {
      test(`${checkCase.name} check assembles parameters and plumbs forced dice`, async () => {
         // Force the known dice sequence immediately before rolling.
         await forceDice(page, FORCED_FACES);

         // Snapshot the baseline count and fire the roll in one serialized evaluate so no message
         // can slip between the snapshot and the invocation; then poll for the message it produced.
         const before = await page.evaluate(async ({ actorLocate, invokeSrc }) => {
            const actor = new Function(`return (${actorLocate})()`)();
            const fixtures = {
               weaponId: actor.items.find((i) => i.type === 'weapon')?.id,
               spellId: actor.items.find((i) => i.type === 'spell')?.id,
               abilityId: actor.items.find((i) => i.type === 'ability')?.id,
            };

            const beforeCount = game.messages.size;
            await new Function('actor', 'fixtures', `return (async () => { ${invokeSrc} })();`)(actor, fixtures);
            return beforeCount;
         }, { actorLocate: ACTOR_LOCATE, invokeSrc: checkCase.invoke });

         const flags = await readNewestCheckFlags(page, before);

         // (0) A message of the right type was created.
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
