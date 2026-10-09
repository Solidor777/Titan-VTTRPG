import { expect, test } from './harness.js';
import { DURATION_PERMANENT } from '~/system/DurationTypes.js';
import { login } from './fixtures.js';
import {
   addEffect,
   addRulesElement,
   applyCondition,
   createActor,
   placeToken,
   removeCondition,
   shared,
   viewScene,
} from './flows.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * Falling Unconscious on real Characters with placed tokens, through the Token HUD: the Unconscious condition also
 * applies Prone and Incapacitated, each once and only if absent, and removing Unconscious leaves both. A Character
 * immune to Prone gains Incapacitated, and the refusal is notified as for any other application.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

/**
 * What a test works on: a Character with a token.
 * @typedef {object} Subject
 * @property {string} actorId - The world actor's id.
 * @property {string} actorUuid - The world actor's uuid.
 * @property {string} tokenId - The id of the actor's placed token.
 */

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await viewScene(page, await shared(page, 'scene'));
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Creates a Character and places its token.
 * @param {string} name - The actor's name.
 * @returns {Promise<Subject>} Resolves with the created Character and its token.
 */
async function createSubject(name) {
   /** @type {string} The id of the new actor. */
   const actorId = await createActor(page, {
      name,
      type: 'player',
   });
   return {
      actorId,
      actorUuid: `Actor.${actorId}`,
      tokenId: await placeToken(page, actorId),
   };
}

/**
 * Counts the effects of a token's actor that carry each of the three conditions.
 * @param {Subject} subject - The Character whose token is read.
 * @returns {Promise<{incapacitated: number, prone: number, unconscious: number}>} The effect counts.
 */
function readConditions(subject) {
   return page.evaluate((tokenId) => {
      /** @type {TitanActor} The token's actor. */
      const actor = canvas.scene.tokens.get(tokenId).actor;

      /**
       * Counts the effects carrying a status.
       * @param {string} id - The status id.
       * @returns {number} The count.
       */
      const count = (id) => actor.effects.filter((effect) => effect.statuses.has(id)).length;
      return {
         incapacitated: count('incapacitated'),
         prone: count('prone'),
         unconscious: count('unconscious'),
      };
   }, subject.tokenId);
}

test('falling Unconscious adds Prone and Incapacitated once, and removing Unconscious leaves them', async () => {
   /** @type {Subject} The Character. */
   const subject = await createSubject('E2E Unconscious Sleeper');
   expect(await readConditions(subject), 'the Character holds none of the conditions').toEqual({
      incapacitated: 0,
      prone: 0,
      unconscious: 0,
   });

   await applyCondition(page, subject.tokenId, 'unconscious');
   await expect.poll(() => readConditions(subject), { message: 'Unconscious brought its companions' }).toEqual({
      incapacitated: 1,
      prone: 1,
      unconscious: 1,
   });

   await removeCondition(page, subject.tokenId, 'unconscious');
   await expect.poll(() => readConditions(subject), { message: 'removing Unconscious left its companions' }).toEqual({
      incapacitated: 1,
      prone: 1,
      unconscious: 0,
   });
});

test('a Character that is already Prone gains no second Prone', async () => {
   /** @type {Subject} The Character. */
   const subject = await createSubject('E2E Unconscious Prone Sleeper');
   await applyCondition(page, subject.tokenId, 'prone');
   expect((await readConditions(subject)).prone, 'the Character is Prone before it falls Unconscious').toBe(1);

   await applyCondition(page, subject.tokenId, 'unconscious');
   await expect.poll(() => readConditions(subject), { message: 'Unconscious brought Incapacitated alone' }).toEqual({
      incapacitated: 1,
      prone: 1,
      unconscious: 1,
   });
});

test('a Character immune to Prone falls Unconscious and Incapacitated, and the refusal is notified', async () => {
   /** @type {Subject} The Character. */
   const subject = await createSubject('E2E Unconscious Immune Sleeper');

   /** @type {string} The id of the effect that grants the immunity. */
   const wardId = await addEffect(page, subject.actorId, 'E2E Unconscious Prone Ward', {
      duration: DURATION_PERMANENT,
   });
   await addRulesElement(page, `${subject.actorUuid}.ActiveEffect.${wardId}`, {
      key: 'prone',
      operation: 'immunity',
      selector: 'condition',
   });
   await closeAllApps(page);

   await applyCondition(page, subject.tokenId, 'unconscious');
   await expect.poll(() => readConditions(subject), { message: 'Unconscious brought Incapacitated alone' }).toEqual({
      incapacitated: 1,
      prone: 0,
      unconscious: 1,
   });

   // The refusal of Prone is a warning notification; dismissing it with a click, as a user does, ends it.
   /** @type {import('@playwright/test').Locator} The refusal notification. */
   const notice = page.locator('#notifications .notification.warning', { hasText: /is immune to/i });
   await expect(notice).toHaveCount(1);
   await notice.click();
   await expect(notice).toHaveCount(0);
});
