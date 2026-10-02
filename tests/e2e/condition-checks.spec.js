import { expect, test } from './harness.js';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps, deleteFixtureActor } from './world.js';
import { readNewestCheckFlags, setSelectField } from './checkDialog.js';

/**
 * Condition check rules on rolled checks: Frightened raises a check's Difficulty through Disadvantage, Incapacitated
 * and Restrained fail Reflexes checks, and Blinded and Deafened fail Perception checks that rely on their sense.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Condition Check Actor';

/** @type {string} Selector for the Attribute Check dialog window. */
const DIALOG_SELECTOR = '.application.titan-dialog[id^="titan-attribute-check-dialog-"]';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The check-options setting in force before this spec. */
let originalCheckOptions;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   originalCheckOptions = await page.evaluate(() => game.settings.get('titan', 'getCheckOptions'));
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate((value) => game.settings.set('titan', 'getCheckOptions', value), originalCheckOptions);
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

/**
 * Rebuilds the actor carrying the given conditions.
 * @param {string[]} conditionIds - The condition ids to apply.
 * @returns {Promise<void>} Resolves once every condition is in the actor's statuses.
 */
async function seedActor(conditionIds) {
   await page.evaluate(async ({ name, ids }) => {
      await game.actors.getName(name)?.delete();

      /** @type {TitanActor} The rebuilt actor. */
      const actor = await Actor.create({
         name,
         type: 'player',
      });
      for (const id of ids) {
         await actor.toggleStatusEffect(id, { active: true });
      }
      await titanWait(() => ids.every((id) => actor.statuses.has(id)), { message: 'conditions applied' });
   }, {
      ids: conditionIds,
      name: ACTOR_NAME,
   });
}

/**
 * Rolls a check straight to chat (no dialog) and returns its message data.
 * @param {string} method - The CharacterDataModel roll method (`rollAttributeCheck` or `rollResistanceCheck`).
 * @param {object} options - The roll options: the stat key, an optional Skill, and named situation keys.
 * @returns {Promise<{id: string, type: string, parameters: object, results: object}>} The rolled check's message.
 */
async function rollCheck(method, options) {
   /** @type {number} The chat-message count before the roll. */
   const baseline = await page.evaluate(() => game.messages.size);
   await page.evaluate(async ({ name, rollMethod, checkOptions }) => {
      await game.actors.getName(name).system[rollMethod](checkOptions);
   }, {
      checkOptions: options,
      name: ACTOR_NAME,
      rollMethod: method,
   });
   return readNewestCheckFlags(page, baseline);
}

test('Frightened gives an Attribute Check Disadvantage, raising its Difficulty from 4 to 5', async () => {
   await seedActor(['frightened']);

   /** @type {{parameters: object}} The rolled check's message. */
   const flags = await rollCheck('rollAttributeCheck', { attribute: 'body' });
   expect(flags.parameters).toMatchObject({
      advantage: -1,
      baseDifficulty: 4,
      difficulty: 5,
   });
});

for (const conditionId of [
   'incapacitated',
   'restrained',
]) {
   test(`${conditionId} automatically fails Reflexes checks but not Resilience checks`, async () => {
      await seedActor([conditionId]);
      expect((await rollCheck('rollResistanceCheck', { resistance: 'reflexes' })).parameters.automaticFailure)
         .toBe(true);
      expect((await rollCheck('rollResistanceCheck', { resistance: 'resilience' })).parameters.automaticFailure)
         .toBe(false);
   });
}

for (const [conditionId, key, labelKey] of [
   [
      'blinded',
      'reliesOnSight',
      'situationReliesOnSight',
   ],
   [
      'deafened',
      'reliesOnHearing',
      'situationReliesOnHearing',
   ],
]) {
   test(`${conditionId} fails a Perception check that relies on the sense, and only when named`, async () => {
      await seedActor([conditionId]);

      /** @type {string} The situation's localized label. */
      const label = await page.evaluate((localizationKey) => game.i18n.localize(`LOCAL.${localizationKey}.text`),
         labelKey);

      /** @type {{parameters: object}} A Perception check naming the situation. */
      const failed = await rollCheck('rollAttributeCheck', {
         situations: [key],
         skill: 'perception',
      });
      expect(failed.parameters.automaticFailure).toBe(true);
      expect(failed.parameters.situations).toEqual([
         {
            key,
            label,
            labelKey,
         },
      ]);

      /** @type {{parameters: object}} A Perception check that does not rely on the sense. */
      const unaffected = await rollCheck('rollAttributeCheck', { skill: 'perception' });
      expect(unaffected.parameters.automaticFailure).toBe(false);
   });
}

test('Blinded offers Relies on Sight in a Perception dialog; the row leaves on a Skill change', async () => {
   await seedActor(['blinded']);
   await page.evaluate(async (name) => {
      await game.settings.set('titan', 'getCheckOptions', 'situational');
      await game.actors.getName(name).system.requestAttributeCheck({ skill: 'perception' });
   }, ACTOR_NAME);

   /** @type {import('@playwright/test').Locator} The open dialog. */
   const dialog = page.locator(DIALOG_SELECTOR);
   await expect(dialog).toBeVisible();

   /** @type {import('@playwright/test').Locator} The Relies on Sight row. */
   const row = dialog.getByTestId('situation-row-reliesOnSight');
   await expect(row).toBeVisible();

   await setSelectField(dialog, 'skill', 'athletics');
   await expect(row).toHaveCount(0);
});
