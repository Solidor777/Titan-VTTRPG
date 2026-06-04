import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Regression: toggling an Active Effect's active state on a Character must update the rendered sheet
 * WITHOUT switching tabs. The bug (Svelte 4->5 migration fallout): the toggle read
 * `active={effect.system.isActive}` off a passed doc prop — not through the reactive `document.data`
 * bridge — so the expression had no reactive dependency and never re-evaluated; the toggle's checkmark
 * stayed stale until the tab was re-mounted. The fix derives `isActive` through `document.data`.
 */

const ACTOR_NAME = 'E2E Effect Reactivity Actor';

test.describe('effect toggle reactivity', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);

      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(ready, 'TITAN system failed to initialize').toBe(true);

      // Rebuild a character carrying one active effect, render its sheet, and open the Effects tab.
      await page.evaluate(async (actorName) => {
         const stale = game.actors.getName(actorName);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name: actorName, type: 'player' });
         await actor.createEmbeddedDocuments('ActiveEffect', [
            { name: 'E2E Reactive Effect', type: 'effect', disabled: false },
         ]);
         const app = await actor.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'sheet mounted' },
         );
      }, ACTOR_NAME);

      // Activate the Effects tab so the effect row and its toggle render.
      await page.getByText('Effects', { exact: true }).first().click();
      await page.waitForTimeout(400);
   });

   test('clicking the active toggle flips the rendered checkmark without a tab switch', async ({ page }) => {
      // The active toggle's checkmark is fa-square-check when active and fa-square when inactive; it is
      // the only square icon in the effect row, so target it directly (the click bubbles to its button).
      const row = page.locator('[data-effect-id]');
      await expect(row.locator('i.fa-square-check'), 'starts active (checked)').toHaveCount(1);

      // Toggle to inactive — staying on the Effects tab (no re-mount).
      await row.locator('i.fa-square-check').click();
      await page.waitForTimeout(400);

      // The rendered checkmark must update reactively in place.
      await expect(row.locator('i.fa-square-check'), 'checkmark cleared reactively').toHaveCount(0);
      await expect(row.locator('i.fa-square'), 'now shows the unchecked icon').toHaveCount(1);

      // And the underlying data really flipped.
      const isActive = await page.evaluate((actorName) =>
         game.actors.getName(actorName).effects.contents[0].system?.isActive, ACTOR_NAME);
      expect(isActive, 'effect is now inactive').toBe(false);
   });
});
