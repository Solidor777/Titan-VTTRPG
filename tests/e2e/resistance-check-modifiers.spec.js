import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps, deleteFixtureActor } from './world.js';
import { forceDice, resetDice } from './dice.js';
import { readNewestCheckFlags } from './checkDialog.js';

/**
 * Resistance Checks read conditional check modifiers: `any`-check penalties (Abjuration of the Arbiter's dice
 * penalty) and `resistance`-check modifiers keyed by the rolled Resistance, including Automatic Failure.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Resistance Modifiers Actor';

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
   await resetDice(page);
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

/**
 * Rebuilds the actor (Body, Mind, and Soul 4, so Reflexes and Willpower are 6) with one effect carrying the given
 * rules elements.
 * @param {object[]} rulesElement - The effect's rules elements (a uuid is generated for each).
 * @returns {Promise<void>} Resolves once the actor and effect exist.
 */
async function seedActor(rulesElement) {
   await page.evaluate(async ({ actorName, elements }) => {
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The rebuilt actor. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
         system: {
            attribute: {
               body: { baseValue: 4 },
               mind: { baseValue: 4 },
               soul: { baseValue: 4 },
            },
         },
      });
      await actor.createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Resistance Effect',
            type: 'effect',
            system: {
               rulesElement: elements.map((element) => ({
                  ...element,
                  uuid: foundry.utils.randomID(),
               })),
            },
         },
      ]);
   }, {
      actorName: ACTOR_NAME,
      elements: rulesElement,
   });
}

/**
 * Rolls a Resistance Check without the dialog and returns the created message.
 * @param {object} options - Resistance and modifier fields passed to `rollResistanceCheck`.
 * @returns {Promise<{id: string, type: string, parameters: object, results: object}>} The new message's id, subtype,
 * parameters, and results.
 */
async function rollResistanceCheck(options) {
   /** @type {number} The chat-message count before the roll. */
   const baseline = await page.evaluate(() => game.messages.size);
   await page.evaluate(async ({ actorName, checkOptions }) => {
      await game.actors.getName(actorName).system.rollResistanceCheck(checkOptions);
   }, {
      actorName: ACTOR_NAME,
      checkOptions: options,
   });

   return readNewestCheckFlags(page, baseline, 'resistanceCheck');
}

test('a Resistance Check picks up an any-check dice penalty and a penalty keyed to its Resistance', async () => {
   await seedActor([
      {
         checkType: 'any',
         key: '',
         modifierType: 'dice',
         operation: 'conditionalCheckModifier',
         selector: 'any',
         skill: '',
         value: -1,
      },
      {
         checkType: 'resistance',
         key: 'reflexes',
         modifierType: 'dice',
         operation: 'conditionalCheckModifier',
         selector: 'resistance',
         skill: '',
         value: -1,
      },
   ]);

   /** @type {{reflexes: number, willpower: number}} The initialized Dice mod per Resistance. */
   const diceMods = await page.evaluate((actorName) => {
      /** @type {TitanActor} The seeded actor. */
      const actor = game.actors.getName(actorName);
      return {
         reflexes: actor.system.initializeResistanceCheckOptions({ resistance: 'reflexes' }).diceMod,
         willpower: actor.system.initializeResistanceCheckOptions({ resistance: 'willpower' }).diceMod,
      };
   }, ACTOR_NAME);
   expect(diceMods).toEqual({
      reflexes: -2,
      willpower: -1,
   });

   /** @type {{id: string, parameters: object, results: object}} The rolled Reflexes check's message. */
   const message = await rollResistanceCheck({ resistance: 'reflexes' });
   expect(message.parameters.resistanceDice).toBeGreaterThan(2);
   expect(message.parameters.diceMod).toBe(-2);
   expect(message.parameters.totalDice).toBe(message.parameters.resistanceDice - 2);
});

test('an Automatic Failure on Reflexes fails a rolled Reflexes check and reduces no damage', async () => {
   await seedActor([
      {
         checkType: 'resistance',
         key: 'reflexes',
         modifierType: 'automaticFailure',
         operation: 'conditionalCheckModifier',
         selector: 'resistance',
         skill: '',
         value: 1,
      },
   ]);
   await forceDice(page, [
      6,
      6,
      6,
      6,
      6,
      6,
   ]);
   /** @type {{id: string, parameters: object, results: object}} The rolled Reflexes check's message. */
   const message = await rollResistanceCheck({
      complexity: 1,
      damageToReduce: 3,
      resistance: 'reflexes',
   });
   expect(message.parameters.automaticFailure).toBe(true);
   expect(message.results).toMatchObject({
      damageTaken: 3,
      successes: 0,
      succeeded: false,
   });
});
