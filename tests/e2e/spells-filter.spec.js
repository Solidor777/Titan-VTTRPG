import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';

/**
 * Regression: the Spells tab filter input must narrow the spell list. It was cross-wired to
 * $appState.tabs.abilities.filter (a copy-paste bug), so typing in the spells filter box did nothing to
 * the spell list. The fix binds it to $appState.tabs.spells.filter.
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

const ACTOR_NAME = 'E2E Spells Filter Actor';

test.describe('spells tab filter', () => {
   test.beforeEach(async () => {
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
   });

   test('typing in the spells filter narrows the spell list', async () => {
      // Both spells visible initially.
      await expect(page.locator('[data-item-id]'), 'both spells shown').toHaveCount(2);

      // Type a distinctive substring of only one spell into the Spells tab filter input.
      const filterInput = page.locator('.tab .header .input input').first();
      await filterInput.fill('Fireball');
      await filterInput.dispatchEvent('keyup');

      await expect(page.locator('[data-item-id]'), 'narrowed to the matching spell').toHaveCount(1);
      await expect(page.getByText('Zzz Fireball')).toBeVisible();
   });
});
