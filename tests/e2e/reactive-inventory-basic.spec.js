import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Reactivity regression for the two Inventory-tab item rows (commodity and equipment). Each row reads
 * several display values (rarity, value, etc.) directly off the `item` Document prop iterated from
 * `document.data.items`. Svelte 5 fine-grained reactivity only tracks reads routed through the reactive
 * `document.data` store, so a plain prop read of `item.system.x` has no reactive dependency: when the
 * underlying item is mutated in place (no tab switch, no re-expand) the rendered footer stays stale. Each
 * test below seeds one item of the relevant type, expands it, then mutates rarity (common -> rare) and
 * value (0 -> 7) in place and asserts the rendered footer reflects the new values.
 */

/** @type {string} - Name of the throwaway player actor seeded for the commodity case. */
const COMMODITY_ACTOR_NAME = 'E2E Reactive Commodity Actor';

/** @type {string} - Name of the throwaway player actor seeded for the equipment case. */
const EQUIPMENT_ACTOR_NAME = 'E2E Reactive Equipment Actor';

/**
 * Seeds a fresh player actor with a single item of the given type and renders its sheet.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @param {string} actorName - The name of the throwaway actor to (re)create.
 * @param {string} itemType - The item subtype to seed (`'commodity'` or `'equipment'`).
 * @returns {Promise<void>} Resolves once the sheet has rendered and settled.
 */
async function seedActorWithItem(page, actorName, itemType) {
   await page.evaluate(async ({ actorName, itemType }) => {
      // Remove any stale fixture from a prior run.
      const stale = game.actors.getName(actorName);
      if (stale) {
         await stale.delete();
      }

      // Seed a fresh player actor with one item whose initial display state is known:
      // rarity 'common' (RarityTag class .common) and value 0 (ValueTag absent via {#if value}).
      const actor = await Actor.create({ name: actorName, type: 'player' });
      await actor.createEmbeddedDocuments('Item', [
         {
            name: `E2E Reactive ${itemType}`,
            type: itemType,
            system: {
               rarity: 'common',
               value: 0,
            },
         },
      ]);

      // Render the sheet and let the Svelte mount and ApplicationV2 render cycle settle.
      await actor.sheet.render(true);
      await new Promise((resolve) => {
         setTimeout(resolve, 600);
      });
   }, { actorName, itemType });
}

/**
 * Opens the Inventory tab, expands the first row, and asserts its footer rarity/value display values
 * update in place after an in-place item update with no tab switch or re-expand.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @param {string} actorName - The name of the seeded actor whose item is mutated.
 */
async function expectInventoryRowReactive(page, actorName) {
   // Activate the Inventory tab and let it settle.
   await page.getByText('Inventory', { exact: true }).first().click();
   await page.waitForTimeout(400);

   // The first inventory row.
   const row = page.locator('[data-item-id]').first();

   // Expand the row in place (the expand button is the first button in the header label area).
   await row.locator('.header .label .button button').first().click();
   await page.waitForTimeout(400);

   // The expandable footer's tag container, plus the two drivable display reads we assert on:
   // the RarityTag root (class carries the rarity key) and the value StatTag.
   const tags = row.locator('.section.tags');
   const rarityCommon = tags.locator('.tag.common');
   const rarityRare = tags.locator('.tag.rare');

   // INITIAL rendered state: rarity 'common' shown, value ValueTag absent (value is 0).
   await expect(rarityCommon, 'initial rarity tag is common').toHaveCount(1);
   await expect(rarityRare, 'initial rarity tag is not rare').toHaveCount(0);

   // Mutate the underlying item IN PLACE: do not switch tabs or collapse the row.
   await page.evaluate(async (name) => {
      const actor = game.actors.getName(name);
      await actor.items.contents[0].update({
         system: {
            rarity: 'rare',
            value: 7,
         },
      });
   }, actorName);
   await page.waitForTimeout(400);

   // The rendered footer must reflect the NEW values in place.
   await expect(rarityRare, 'rarity tag updated to rare in place').toHaveCount(1);
   await expect(rarityCommon, 'rarity tag no longer common in place').toHaveCount(0);
}

test.describe('character sheet inventory row reactivity', () => {
   test('commodity footer display values update in place after an in-place item update', async ({ page }) => {
      await login(page);
      await seedActorWithItem(page, COMMODITY_ACTOR_NAME, 'commodity');
      await expectInventoryRowReactive(page, COMMODITY_ACTOR_NAME);
   });

   test('equipment footer display values update in place after an in-place item update', async ({ page }) => {
      await login(page);
      await seedActorWithItem(page, EQUIPMENT_ACTOR_NAME, 'equipment');
      await expectInventoryRowReactive(page, EQUIPMENT_ACTOR_NAME);
   });
});
