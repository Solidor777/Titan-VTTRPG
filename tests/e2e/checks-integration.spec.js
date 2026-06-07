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

test.describe('check chat-card interactions (clone-then-update parity)', () => {
   /**
    * Reads a plain snapshot of the newest message's check state for delta assertions.
    * @param {string} messageId - The message to read.
    * @returns {Promise<object>} `{ dice: {final, expertiseApplied}[], expertiseRemaining }`.
    */
   function readCheckState(messageId) {
      return page.evaluate((id) => {
         const system = game.messages.get(id).system.toObject();
         return {
            dice: system.results.dice.map((die) => ({
               final: die.final,
               expertiseApplied: die.expertiseApplied,
            })),
            expertiseRemaining: system.results.expertiseRemaining,
         };
      }, messageId);
   }

   test('die click applies expertise; reset restores the roll', async () => {
      // Difficulty 4, expertiseMod 2, forced [3, 1, 1]: roll-time auto-expertise raises the 3 to 4
      // (cheapest first) and leaves 1 expertise remaining with two clickable failure dice.
      await forceDice(page, [3, 1, 1]);
      const messageId = await page.evaluate(async () => {
         const actor = game.actors.getName('E2E Roller');
         const before = game.messages.size;
         await actor.system.rollAttributeCheck({ attribute: 'body', expertiseMod: 2 });
         await globalThis.titanWait(() => game.messages.size > before, { message: 'check message created' });
         return game.messages.contents.at(-1).id;
      });

      // Confirm the roll-time state the click test depends on.
      expect(await readCheckState(messageId)).toEqual({
         dice: [
            { final: 4, expertiseApplied: 1 },
            { final: 1, expertiseApplied: 0 },
            { final: 1, expertiseApplied: 0 },
         ],
         expertiseRemaining: 1,
      });

      // Show the chat tab and click the second die (final 1 — clickable while expertise remains).
      // The sidebar boots collapsed and programmatic changeTab does not expand it (a user's tab
      // click does, via _onClickTab), so expand explicitly to bring the chat log into the viewport.
      await page.evaluate(() => {
         ui.sidebar.changeTab('chat', 'primary');
         ui.sidebar.expand();
      });
      const card = page.locator(`#chat .chat-log li[data-message-id="${messageId}"]`);
      await card.locator('.die button').nth(1).click();

      // The update round-trip persists the bumped die and spends the last expertise.
      await expect.poll(() => readCheckState(messageId)).toEqual({
         dice: [
            { final: 4, expertiseApplied: 1 },
            { final: 2, expertiseApplied: 1 },
            { final: 1, expertiseApplied: 0 },
         ],
         expertiseRemaining: 0,
      });

      // The card re-renders the die with its expertise label.
      await expect(card.locator('.die').nth(1)).toContainText('1 + 1');

      // Reset restores every die to its base and refunds the full expertise pool.
      await card.locator('button:has(i.fa-rotate-left)').click();
      await expect.poll(() => readCheckState(messageId)).toEqual({
         dice: [
            { final: 3, expertiseApplied: 0 },
            { final: 1, expertiseApplied: 0 },
            { final: 1, expertiseApplied: 0 },
         ],
         expertiseRemaining: 2,
      });
   });

   test('scaling aspect increase/decrease/reset adjust the clone-backed results', async () => {
      // Give the roller's spell a scaling damage aspect (in-test only; the shared builders stay
      // untouched so the zero-expertise oracle tests keep their complexity expectations).
      await page.evaluate(async () => {
         const actor = game.actors.getName('E2E Roller');
         const spell = actor.items.find((item) => item.type === 'spell');
         await spell.update({
            system: {
               customAspect: [
                  {
                     label: 'E2E Damage Aspect',
                     scaling: true,
                     initialValue: 1,
                     cost: 1,
                     resistanceCheck: 'none',
                     isDamage: true,
                     isHealing: false,
                     uuid: 'e2e0aaaa-0000-4000-8000-000000000001',
                  },
               ],
            },
         });
      });

      // Force three successes (difficulty 4, complexity 1), banking two extra successes at roll time.
      await forceDice(page, [6, 6, 6]);
      const messageId = await page.evaluate(async () => {
         const actor = game.actors.getName('E2E Roller');
         const spell = actor.items.find((item) => item.type === 'spell');
         const before = game.messages.size;
         await actor.system.rollCastingCheck({ itemId: spell.id });
         await globalThis.titanWait(() => game.messages.size > before, { message: 'casting message created' });
         return game.messages.contents.at(-1).id;
      });

      /**
       * Reads a plain snapshot of the casting message's scaling state.
       * @returns {Promise<object>} `{ currentValue, extraSuccessesRemaining, damage }`.
       */
      const readScalingState = () => page.evaluate((id) => {
         const system = game.messages.get(id).system.toObject();
         return {
            currentValue: system.results.scalingAspect[0].currentValue,
            extraSuccessesRemaining: system.results.extraSuccessesRemaining,
            damage: system.results.damage,
         };
      }, messageId);

      // Roll-time auto-maximization: with exactly ONE affordable scaling aspect,
      // calculateCastingCheckResults spends every extra success on it at roll time (2 extra successes
      // at cost 1 each), so the card opens maxed out: value 1 + 2, damage 1 + 2, nothing left to spend.
      expect(await readScalingState()).toEqual({
         currentValue: 3,
         extraSuccessesRemaining: 0,
         damage: 3,
      });

      // Show the chat tab; expand explicitly because programmatic changeTab keeps the sidebar
      // collapsed, parking the chat log outside the viewport.
      await page.evaluate(() => {
         ui.sidebar.changeTab('chat', 'primary');
         ui.sidebar.expand();
      });

      // The scaling-aspects list nests a div.aspect wrapper around the component's own div.aspect
      // root, so target the first (outermost) match for the single seeded aspect.
      const aspect = page.locator(`#chat .chat-log li[data-message-id="${messageId}"] .aspect`).first();

      // Decrease (third .control) refunds one success: -1 value and damage, +cost extra successes.
      // Increase starts DISABLED (no extra successes remain), so decrease must move first.
      await aspect.locator('.controls .control:nth-child(3) button').click();
      await expect.poll(readScalingState).toEqual({
         currentValue: 2,
         extraSuccessesRemaining: 1,
         damage: 2,
      });
      await expect(aspect.locator('.header .value')).toHaveText('2');

      // Increase (fourth .control) spends it back: +1 value and damage, -cost extra successes.
      await aspect.locator('.controls .control:nth-child(4) button').click();
      await expect.poll(readScalingState).toEqual({
         currentValue: 3,
         extraSuccessesRemaining: 0,
         damage: 3,
      });
      await expect(aspect.locator('.header .value')).toHaveText('3');

      // Reset (second .control) restores the aspect to its INITIAL value, refunding every spent
      // success — it does NOT return to the auto-maximized roll-time state. Decrease first so reset
      // is exercised from a mid-range value with a known delta of 1.
      await aspect.locator('.controls .control:nth-child(3) button').click();
      await expect.poll(readScalingState).toEqual({
         currentValue: 2,
         extraSuccessesRemaining: 1,
         damage: 2,
      });
      await aspect.locator('.controls .control:nth-child(2) button').click();
      await expect.poll(readScalingState).toEqual({
         currentValue: 1,
         extraSuccessesRemaining: 2,
         damage: 1,
      });
   });
});
