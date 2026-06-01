import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Regression: the character-sheet expand toggle must reveal a row's expandable content IN PLACE (no tab
 * switch). It was broken because expansion state (applicationState tabs.<tab>.isExpanded) was passed down
 * as a plain inner-object prop and bound by dynamic key, severing it from the $appState store root so no
 * store update fired. The fix re-roots the bind at $appState in the list components. Covers all three list
 * components: CharacterSheetEffectList (effects), CharacterSheetItemList (abilities), and
 * CharacterSheetMultiItemList (inventory / weapon).
 */

const ACTOR_NAME = 'E2E Expanded Toggle Actor';

test.describe('character sheet expand toggle reactivity', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
      await page.evaluate(async (actorName) => {
         const stale = game.actors.getName(actorName);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name: actorName, type: 'player' });
         await actor.createEmbeddedDocuments('ActiveEffect', [
            { name: 'E2E Expand Effect', type: 'effect', disabled: false },
         ]);
         await actor.createEmbeddedDocuments('Item', [
            { name: 'E2E Expand Ability', type: 'ability' },
            { name: 'E2E Expand Weapon', type: 'weapon' },
            { name: 'E2E Expand Spell', type: 'spell' },
         ]);
         await actor.sheet.render(true);
         await new Promise((resolve) => {
            setTimeout(resolve, 600);
         });
      }, ACTOR_NAME);
   });

   /**
    * Activates a sheet tab by its visible label, expands the first row of the given selector, and asserts
    * the expandable content appears in place.
    * @param {import('@playwright/test').Page} page - The Playwright page.
    * @param {string} tabLabel - The visible tab label to click.
    * @param {string} rowSelector - The row locator (e.g. '[data-effect-id]').
    */
   async function expectExpandInPlace(page, tabLabel, rowSelector) {
      await page.getByText(tabLabel, { exact: true }).first().click();
      await page.waitForTimeout(400);

      const row = page.locator(rowSelector).first();
      await expect(row.locator('.expandable-content'), `${tabLabel}: starts collapsed`).toHaveCount(0);

      // The expand button is the first button in the row header's label area.
      await row.locator('.header .label .button button').first().click();
      await page.waitForTimeout(400);

      await expect(
         row.locator('.expandable-content'),
         `${tabLabel}: expandable content revealed in place`,
      ).toHaveCount(1);
   }

   test('effect rows expand in place (CharacterSheetEffectList)', async ({ page }) => {
      await expectExpandInPlace(page, 'Effects', '[data-effect-id]');
   });

   test('ability rows expand in place (CharacterSheetItemList)', async ({ page }) => {
      await expectExpandInPlace(page, 'Abilities', '[data-item-id]');
   });

   test('inventory rows expand in place (CharacterSheetMultiItemList)', async ({ page }) => {
      await expectExpandInPlace(page, 'Inventory', '[data-item-id]');
   });

   test('spell rows expand in place (CharacterSheetItemList/spells)', async ({ page }) => {
      await expectExpandInPlace(page, 'Spells', '[data-item-id]');
   });
});
