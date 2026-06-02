import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

test.describe('effect tray sidebar tab', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.ui?.titanEffects);
      expect(ready, 'TITAN system + titanEffects tab must be registered').toBe(true);
   });

   test('the titanEffects tab is registered and its panel mounts', async ({ page }) => {
      // The tab class is registered on CONFIG.ui and added to the Sidebar tab list.
      const registered = await page.evaluate(() => {
         const inTabs = 'titanEffects' in foundry.applications.sidebar.Sidebar.TABS;
         const hasClass = !!CONFIG.ui.titanEffects;
         return inTabs && hasClass;
      });
      expect(registered, 'titanEffects must be in Sidebar.TABS and CONFIG.ui').toBe(true);

      // Activate the tab and confirm the Svelte panel mounted with our marker.
      const errors = [];
      page.on('pageerror', (err) => {
         errors.push(err.message);
      });
      await page.evaluate(async () => {
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await new Promise((resolve) => {
            setTimeout(resolve, 500);
         });
      });
      await expect(page.locator('[data-testid="effect-tray"]').first()).toBeVisible();
      expect(errors, `uncaught errors mounting the tray:\n${errors.join('\n')}`).toEqual([]);
   });
});
