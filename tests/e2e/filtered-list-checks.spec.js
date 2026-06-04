import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * Integration regression for the FiltereedList fix: the item sheet's Checks-tab search filter must
 * actually narrow the rendered checks list. Before the fix, FiltereedList rendered the UNFILTERED
 * source array, so typing in the TopFilter changed nothing (and a no-match filter hid the whole list
 * via the length guard). This drives the live ability-item sheet end to end: it creates an ability
 * with two distinctly labelled checks, opens the sheet as the GM, navigates to the Checks tab, types a
 * filter matching exactly one check, and asserts the rendered list narrows to that single check.
 */

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

// The two distinct check labels seeded onto the fixture ability.
const CHECK_LABELS = ['AlphaCheck', 'BravoCheck'];

test.describe('checks tab filter (live item sheet)', () => {
   test.beforeEach(async () => {
      // Precondition: the TITAN system must have initialized.
      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Item?.dataModels?.ability);
      expect(systemReady, 'TITAN system initialized before checks-filter walk').toBe(true);
   });

   test.afterEach(async () => {
      // Close any open sheet and delete the fixture item so sheets do not accumulate across retries.
      await page.evaluate(async () => {
         const item = globalThis.game.items.getName('E2E Filter Ability');
         await item?.sheet?.close();
         await item?.delete();
      });
   });

   test('typing into the TopFilter narrows the rendered checks list to the matching check', async () => {
      // Rebuild a clean ability fixture carrying two distinctly labelled checks, then render its sheet.
      await page.evaluate(async (labels) => {
         const stale = game.items.getName('E2E Filter Ability');
         if (stale) {
            await stale.delete();
         }

         const ability = await Item.create({
            name: 'E2E Filter Ability',
            type: 'ability',
         });

         // Add one check per label, then set each check's label so the two checks differ on screen.
         for (let i = 0; i < labels.length; i++) {
            await ability.addCheck();
         }
         const check = foundry.utils.deepClone(ability.system.check);
         labels.forEach((label, idx) => {
            check[idx].label = label;
         });
         await ability.update({ system: { check } });

         await ability.sheet.render(true);
      }, CHECK_LABELS);

      // Scope every locator to the rendered item sheet window. Awaiting visibility replaces the previous
      // fixed render delay: Playwright auto-retries until the freshly rendered sheet is on screen.
      const sheet = page.locator('.titan-item-sheet').last();
      await expect(sheet).toBeVisible();

      // Navigate to the Checks tab by clicking its tab button.
      await sheet.getByText('Checks', { exact: true }).click();

      // The checks list (FiltereedList <ol>) and the filter input both live inside the checks tab.
      const checkItems = sheet.locator('.scrolling-content > ol > li');
      const filterInput = sheet.locator('.filter input');

      // Both checks render before any filtering.
      await expect(checkItems).toHaveCount(CHECK_LABELS.length);

      // Type a filter fragment that matches only the first check's label.
      await filterInput.fill('Alpha');

      // The list narrows to exactly the matching check.
      await expect(checkItems).toHaveCount(1);
      await expect(checkItems.locator('.header .label input')).toHaveValue('AlphaCheck');

      // No uncaught errors during the render/filter walk.
      expect(errors, `uncaught errors during checks-filter walk:\n${errors.join('\n')}`).toEqual([]);
   });
});
