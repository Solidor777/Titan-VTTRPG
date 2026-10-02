import { expect, test } from './harness.js';
import { login } from './fixtures.js';
import { attachPageErrors, closeAllApps, deleteFixtureActor } from './world.js';

/**
 * A condition's penalty reaches the rendered character sheet: the Defense rating label drops and its breakdown
 * tooltip lists the Conditions line while the condition applies, and loses it when the condition is removed.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Stat Breakdown Actor';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

/**
 * Locates the sheet's Defense rating label.
 * @returns {import('@playwright/test').Locator} A locator resolving to the open sheet's Defense value label.
 */
function defenseLabel() {
   return page.locator('.application.titan-document-sheet [data-testid="sheet-rating-defense"]');
}

/**
 * Reads the Defense label's tooltip content (tippy keeps it on the reference element).
 * @returns {Promise<string>} The tooltip HTML.
 */
function readDefenseTooltip() {
   return page.evaluate(() => document
      .querySelector('.application.titan-document-sheet [data-testid="sheet-rating-defense"]')
      ?._tippy?.props.content ?? '');
}

test('Blinded lowers the sheet\'s Defense by a quarter of its base and the breakdown lists Conditions', async () => {
   /** @type {string} The localized Conditions label. */
   const conditionsLabel = await page.evaluate(async (name) => {
      await game.actors.getName(name)?.delete();

      /** @type {TitanActor} The actor, Body 8 and Dexterity 8 so its Defense base is 8. */
      const actor = await Actor.create({
         name,
         type: 'player',
         system: {
            attribute: { body: { baseValue: 8 } },
            skill: { dexterity: { training: { baseValue: 8 } } },
         },
      });
      await actor.sheet.render(true);
      return game.i18n.localize('LOCAL.conditions.text');
   }, ACTOR_NAME);
   await expect(defenseLabel()).toHaveText('8');

   await page.evaluate((name) => game.actors.getName(name).toggleStatusEffect('blinded', { active: true }),
      ACTOR_NAME);
   await expect(defenseLabel()).toHaveText('6');
   await expect.poll(readDefenseTooltip, { message: 'the breakdown lists the condition penalty' })
      .toContain(`${conditionsLabel}: -2`);

   await page.evaluate((name) => game.actors.getName(name).toggleStatusEffect('blinded', { active: false }),
      ACTOR_NAME);
   await expect(defenseLabel()).toHaveText('8');
   await expect.poll(readDefenseTooltip, { message: 'the Conditions line leaves with the condition' })
      .not.toContain(`${conditionsLabel}:`);
});
