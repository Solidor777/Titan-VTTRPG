import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Phase 3a Concern B — rules-element add/delete reactivity bug hunt. The rules-element tab renders one
 * `.rules-element` row per `document.data.system.rulesElement` entry. `RulesElementMixin.addRulesElement`
 * / `deleteRulesElement` mutate the live array IN PLACE and pass the mutated reference to `update()`,
 * which can defeat `ReactiveDocument` change-detection (persists but doesn't re-render). This drives the
 * real UI and asserts both persistence AND in-place re-render. A failure here is a real engine bug; the
 * fix is a fresh array (user pre-authorized).
 */

const ITEM_NAME = 'E2E RulesElement Item';

test.describe('rules-element add/delete reactivity', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);

      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Item?.dataModels?.weapon);
      expect(ready, 'TITAN system failed to initialize').toBe(true);

      // Rebuild a clean weapon (no rules elements) and render its sheet.
      await page.evaluate(async (name) => {
         const stale = game.items.getName(name);
         if (stale) {
            await stale.delete();
         }
         const item = await Item.create({ name, type: 'weapon' });
         await item.sheet.render(true);
         await new Promise((resolve) => {
            setTimeout(resolve, 500);
         });
      }, ITEM_NAME);

      // Activate the Rules Elements tab so its list and Add button render.
      const label = await page.evaluate(() => game.i18n.localize('LOCAL.rulesElements.text'));
      await page.locator('.tab-list').getByText(label, { exact: true }).click();
      await page.waitForTimeout(300);
   });

   test('adding then deleting a rules element re-renders the list in place', async ({ page }) => {
      const rows = page.locator('.rules-element');
      await expect(rows, 'starts with no rules elements').toHaveCount(0);

      // Add via the tab's "Add Element" button.
      await page.locator('.add-entry-button button').click();
      await page.waitForTimeout(400);

      const afterAdd = await page.evaluate((name) =>
         game.items.getName(name).system.rulesElement.length, ITEM_NAME);
      expect(afterAdd, 'element persisted').toBe(1);
      await expect(rows, 'list re-rendered with the new row').toHaveCount(1);

      // Delete via the row's delete button.
      await page.locator('.rules-element .delete-button button').first().click();
      await page.waitForTimeout(400);

      const afterDelete = await page.evaluate((name) =>
         game.items.getName(name).system.rulesElement.length, ITEM_NAME);
      expect(afterDelete, 'element removed').toBe(0);
      await expect(rows, 'list re-rendered without the row').toHaveCount(0);
   });
});
