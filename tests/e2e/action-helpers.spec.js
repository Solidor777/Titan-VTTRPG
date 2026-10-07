import { expect, test } from './harness.js';
import { login, openSheetByUuid } from './fixtures.js';
import { addAttack, addRulesElement, createWorldItem } from './flows.js';
import { clickSheetTab, commitText } from './actions.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * The contract of the action helpers: each returns only after the document operations, renders and (for the helpers
 * that add a row the caller then edits) window transitions its action started have finished (`settle.js`), so the
 * caller's next action cannot land before the re-render of the previous one (CLOSED_BUGS #131). Each test runs a helper
 * and reads what is still in flight at the moment it returns; a helper without its `settle` call returns with queued
 * renders or Svelte transitions still running.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The uuid of the weapon the helpers act on. */
let weaponUuid;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   weaponUuid = `Item.${await createWorldItem(page, {
      name: 'E2E Action Helpers Weapon',
      type: 'weapon',
   })}`;
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Reads what is in flight in the page right now.
 * @returns {Promise<{pending: number, animations: number}>} The tracked operations and renders, and the finite
 * animations running inside application windows.
 */
function readInFlight() {
   return page.evaluate(() => ({
      pending: globalThis.titanPending,
      animations: document.getAnimations().filter(
         (animation) => animation.playState !== 'finished'
            && Number.isFinite(animation.effect?.getComputedTiming().endTime)
            && animation.effect.target?.closest?.('.application .window-content'),
      ).length,
   }));
}

test.describe('an action helper returns with nothing in flight', () => {
   test('addAttack', async () => {
      await addAttack(page, weaponUuid);
      expect(await readInFlight()).toEqual({
         pending: 0,
         animations: 0,
      });
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('commitText', async () => {
      /** @type {import('@playwright/test').Locator} The weapon's sheet. */
      const sheet = await openSheetByUuid(page, weaponUuid);
      await clickSheetTab(sheet, 'Attacks');
      await commitText(sheet.locator('.attack .header .label input').first(), 'E2E Action Helpers Attack');
      expect((await readInFlight()).pending).toBe(0);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('addRulesElement', async () => {
      await addRulesElement(page, weaponUuid, {});
      expect(await readInFlight()).toEqual({
         pending: 0,
         animations: 0,
      });
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
