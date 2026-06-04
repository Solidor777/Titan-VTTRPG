import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Regression: the Spells tab filter input must narrow the spell list. It was cross-wired to
 * $appState.tabs.abilities.filter (a copy-paste bug), so typing in the spells filter box did nothing to
 * the spell list. The fix binds it to $appState.tabs.spells.filter.
 */

const ACTOR_NAME = 'E2E Spells Filter Actor';

test.describe('spells tab filter', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
      await page.evaluate(async (actorName) => {
         const stale = game.actors.getName(actorName);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name: actorName, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [
            { name: 'Zzz Fireball', type: 'spell' },
            { name: 'Qqq Frostbite', type: 'spell' },
         ]);
         const app = await actor.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'sheet mounted' },
         );
      }, ACTOR_NAME);

      await page.getByText('Spells', { exact: true }).first().click();
      await page.waitForTimeout(400);
   });

   test('typing in the spells filter narrows the spell list', async ({ page }) => {
      // Both spells visible initially.
      await expect(page.locator('[data-item-id]'), 'both spells shown').toHaveCount(2);

      // Type a distinctive substring of only one spell into the Spells tab filter input.
      const filterInput = page.locator('.tab .header .input input').first();
      await filterInput.fill('Fireball');
      await filterInput.dispatchEvent('keyup');
      await page.waitForTimeout(400);

      await expect(page.locator('[data-item-id]'), 'narrowed to the matching spell').toHaveCount(1);
      await expect(page.getByText('Zzz Fireball')).toBeVisible();
   });
});
