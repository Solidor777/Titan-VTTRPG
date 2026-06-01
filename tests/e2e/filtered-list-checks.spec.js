import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Integration regression for the FiltereedList fix: the item sheet's Checks-tab search filter must
 * actually narrow the rendered checks list. Before the fix, FiltereedList rendered the UNFILTERED
 * source array, so typing in the TopFilter changed nothing (and a no-match filter hid the whole list
 * via the length guard). This drives the live ability-item sheet end to end: it creates an ability
 * with two distinctly labelled checks, opens the sheet as the GM, navigates to the Checks tab, types a
 * filter matching exactly one check, and asserts the rendered list narrows to that single check.
 */

// The two distinct check labels seeded onto the fixture ability.
const CHECK_LABELS = ['AlphaCheck', 'BravoCheck'];

test.describe('checks tab filter (live item sheet)', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);

      // Precondition: the TITAN system must have initialized.
      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Item?.dataModels?.ability);
      expect(systemReady, 'TITAN system initialized before checks-filter walk').toBe(true);
   });

   test('typing into the TopFilter narrows the rendered checks list to the matching check', async ({ page }) => {
      // Capture uncaught errors during the render/filter window.
      const errors = [];
      page.on('pageerror', (err) => {
         errors.push(err.message);
      });

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
         await new Promise((resolve) => {
            setTimeout(resolve, 600);
         });
      }, CHECK_LABELS);

      // Scope every locator to the rendered item sheet window.
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
