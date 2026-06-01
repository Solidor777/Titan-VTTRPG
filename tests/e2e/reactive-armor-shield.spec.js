import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Reactivity regression for the two armor/shield Inventory-tab item rows. Each row's stat sub-component
 * (`CharacterSheetArmorStats` / `CharacterSheetShieldStats`) reads its display values (armor value, defense,
 * rarity, etc.) directly off the `item` Document prop iterated from `document.data.items`. Svelte 5
 * fine-grained reactivity only tracks reads routed through the reactive `document.data` store, so a plain
 * prop read of `item.system.x` has no reactive dependency: when the underlying item is mutated in place (no
 * tab switch, no re-expand) the rendered stats stay stale. Each test below seeds one item of the relevant
 * type, expands it, then mutates rarity (common -> rare) and the numeric stat in place and asserts the
 * rendered stats reflect the new values.
 */

/** @type {string} - Name of the throwaway player actor seeded for the armor case. */
const ARMOR_ACTOR_NAME = 'E2E Reactive Armor Actor';

/** @type {string} - Name of the throwaway player actor seeded for the shield case. */
const SHIELD_ACTOR_NAME = 'E2E Reactive Shield Actor';

/**
 * Seeds a fresh player actor with a single item of the given type/system and renders its sheet.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @param {string} actorName - The name of the throwaway actor to (re)create.
 * @param {string} itemType - The item subtype to seed (`'armor'` or `'shield'`).
 * @param {object} system - The initial system data for the seeded item.
 * @returns {Promise<void>} Resolves once the sheet has rendered and settled.
 */
async function seedActorWithItem(page, actorName, itemType, system) {
   await page.evaluate(async ({ actorName, itemType, system }) => {
      // Remove any stale fixture from a prior run.
      const stale = game.actors.getName(actorName);
      if (stale) {
         await stale.delete();
      }

      // Seed a fresh player actor with one item whose initial display state is known.
      const actor = await Actor.create({ name: actorName, type: 'player' });
      await actor.createEmbeddedDocuments('Item', [
         {
            name: `E2E Reactive ${itemType}`,
            type: itemType,
            system,
         },
      ]);

      // Render the sheet and let the Svelte mount and ApplicationV2 render cycle settle.
      await actor.sheet.render(true);
      await new Promise((resolve) => {
         setTimeout(resolve, 600);
      });
   }, { actorName, itemType, system });
}

/**
 * Opens the Inventory tab and expands the first row in place.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @returns {Promise<import('@playwright/test').Locator>} The expanded row locator.
 */
async function openInventoryAndExpandFirstRow(page) {
   // Activate the Inventory tab and let it settle.
   await page.getByText('Inventory', { exact: true }).first().click();
   await page.waitForTimeout(400);

   // The first inventory row.
   const row = page.locator('[data-item-id]').first();

   // Expand the row in place (the expand button is the first button in the header label area).
   await row.locator('.header .label .button button').first().click();
   await page.waitForTimeout(400);

   return row;
}

test.describe('character sheet armor/shield row reactivity', () => {
   test('armor stats update in place after an in-place item update', async ({ page }) => {
      await login(page);

      // Seed armor with rarity 'common' and armor value/max equal at 1 (IconStatTag shows just '1').
      await seedActorWithItem(page, ARMOR_ACTOR_NAME, 'armor', {
         rarity: 'common',
         armor: {
            value: 1,
            max: 1,
         },
      });

      const row = await openInventoryAndExpandFirstRow(page);

      // The expandable footer's tag container and the two drivable display reads we assert on: the armor
      // IconStatTag value (first `.stat .value`) and the RarityTag root (class carries the rarity key).
      const tags = row.locator('.section.tags');
      const armorValue = tags.locator('.stat .value').first();
      const rarityCommon = tags.locator('.tag.common');
      const rarityRare = tags.locator('.tag.rare');

      // INITIAL rendered state: armor value shows '1' (value === max), rarity 'common'.
      await expect(armorValue, 'initial armor value is 1').toHaveText('1');
      await expect(rarityCommon, 'initial rarity tag is common').toHaveCount(1);
      await expect(rarityRare, 'initial rarity tag is not rare').toHaveCount(0);

      // Mutate the underlying item IN PLACE: do not switch tabs or collapse the row.
      await page.evaluate(async (name) => {
         const actor = game.actors.getName(name);
         await actor.items.contents[0].update({
            system: {
               rarity: 'rare',
               armor: {
                  value: 3,
                  max: 5,
               },
            },
         });
      }, ARMOR_ACTOR_NAME);
      await page.waitForTimeout(400);

      // The rendered stats must reflect the NEW values in place (value !== max now shows '3 / 5').
      await expect(armorValue, 'armor value updated to 3 / 5 in place').toHaveText('3 / 5');
      await expect(rarityRare, 'rarity tag updated to rare in place').toHaveCount(1);
      await expect(rarityCommon, 'rarity tag no longer common in place').toHaveCount(0);
   });

   test('shield stats update in place after an in-place item update', async ({ page }) => {
      await login(page);

      // Seed shield with rarity 'common' and defense 2 (IconStatTag shows '2').
      await seedActorWithItem(page, SHIELD_ACTOR_NAME, 'shield', {
         rarity: 'common',
         defense: 2,
      });

      const row = await openInventoryAndExpandFirstRow(page);

      // The expandable footer's tag container and the two drivable display reads we assert on: the defense
      // IconStatTag value (first `.stat .value`) and the RarityTag root (class carries the rarity key).
      const tags = row.locator('.section.tags');
      const defenseValue = tags.locator('.stat .value').first();
      const rarityCommon = tags.locator('.tag.common');
      const rarityRare = tags.locator('.tag.rare');

      // INITIAL rendered state: defense value shows '2', rarity 'common'.
      await expect(defenseValue, 'initial defense value is 2').toHaveText('2');
      await expect(rarityCommon, 'initial rarity tag is common').toHaveCount(1);
      await expect(rarityRare, 'initial rarity tag is not rare').toHaveCount(0);

      // Mutate the underlying item IN PLACE: do not switch tabs or collapse the row.
      await page.evaluate(async (name) => {
         const actor = game.actors.getName(name);
         await actor.items.contents[0].update({
            system: {
               rarity: 'rare',
               defense: 6,
            },
         });
      }, SHIELD_ACTOR_NAME);
      await page.waitForTimeout(400);

      // The rendered stats must reflect the NEW values in place.
      await expect(defenseValue, 'defense value updated to 6 in place').toHaveText('6');
      await expect(rarityRare, 'rarity tag updated to rare in place').toHaveCount(1);
      await expect(rarityCommon, 'rarity tag no longer common in place').toHaveCount(0);
   });
});
