import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Reactivity regression for the Inventory-tab weapon item row and its per-attack sub-components. The
 * weapon row (`CharacterSheetWeapon`) reads its footer display values (rarity, value, etc.) directly off
 * the `item` Document prop iterated from `document.data.items`, and the per-attack sub-component
 * (`CharacterSheetWeaponAttack`) reads the attack label/damage off `item.system.attack[attackIdx]`. Svelte
 * 5 fine-grained reactivity only tracks reads routed through the reactive `document.data` store, so a plain
 * prop read of `item.system.x` has no reactive dependency: when the underlying item is mutated in place (no
 * tab switch, no re-expand) the rendered values stay stale. This spec seeds one weapon, expands it, then
 * (1) mutates rarity (common -> rare) and value (0 -> 7) and (2) mutates the default attack's label in
 * place and asserts the rendered weapon footer and attack header reflect the new values.
 */

/** @type {string} - Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Reactive Weapon Actor';

test.describe('character sheet weapon row reactivity', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
      await page.evaluate(async (actorName) => {
         // Remove any stale fixture from a prior run.
         const stale = game.actors.getName(actorName);
         if (stale) {
            await stale.delete();
         }

         // Seed a fresh player actor with one weapon whose initial display state is known: rarity 'common'
         // (RarityTag class .common), value 0 (ValueTag absent via {#if item.system.value}), and a single
         // default attack whose label is 'Attack'.
         const actor = await Actor.create({ name: actorName, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [
            {
               name: 'E2E Reactive Weapon',
               type: 'weapon',
               system: {
                  rarity: 'common',
                  value: 0,
               },
            },
         ]);

         // Render the sheet and wait until the Svelte component has mounted its content.
         const app = await actor.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'sheet mounted' },
         );
      }, ACTOR_NAME);
   });

   test('weapon footer display values update in place after an in-place item update', async ({ page }) => {
      // Activate the Inventory tab; the row click below auto-waits for the rendered row.
      await page.getByText('Inventory', { exact: true }).first().click();

      // The first inventory row.
      const row = page.locator('[data-item-id]').first();

      // Expand the row in place (the expand button is the first button in the header label area).
      await row.locator('.header .label .button button').first().click();

      // The expandable footer's tag container, plus the two drivable display reads we assert on: the
      // RarityTag root (class carries the rarity key) and the ValueTag StatTag value.
      const tags = row.locator('.section.tags');
      const rarityCommon = tags.locator('.tag.common');
      const rarityRare = tags.locator('.tag.rare');
      const valueTag = tags.locator('.tag .value');

      // INITIAL rendered state: rarity 'common' shown, ValueTag absent (value is 0).
      await expect(rarityCommon, 'initial rarity tag is common').toHaveCount(1);
      await expect(rarityRare, 'initial rarity tag is not rare').toHaveCount(0);
      await expect(valueTag, 'initial ValueTag absent (value 0)').toHaveCount(0);

      // Mutate the underlying item IN PLACE: do not switch tabs or collapse the row.
      await page.evaluate(async (actorName) => {
         const actor = game.actors.getName(actorName);
         await actor.items.contents[0].update({
            system: {
               rarity: 'rare',
               value: 7,
            },
         });
      }, ACTOR_NAME);

      // The rendered footer must reflect the NEW values in place (assertions below auto-retry).
      await expect(rarityRare, 'rarity tag updated to rare in place').toHaveCount(1);
      await expect(rarityCommon, 'rarity tag no longer common in place').toHaveCount(0);
      await expect(valueTag, 'ValueTag now present in place').toHaveCount(1);
      await expect(valueTag, 'ValueTag shows 7 in place').toHaveText('7');
   });

   test('weapon attack label updates in place after an in-place item update', async ({ page }) => {
      // Activate the Inventory tab; the row click below auto-waits for the rendered row.
      await page.getByText('Inventory', { exact: true }).first().click();

      // The first inventory row.
      const row = page.locator('[data-item-id]').first();

      // Expand the row in place (the expand button is the first button in the header label area).
      await row.locator('.header .label .button button').first().click();

      // The default attack renders its label in the attack header. The weapon is unequipped, so the label
      // renders as a plain `.attack .header .label` div (no DocumentOwnerButton).
      const attackLabel = row.locator('.attack .header .label').first();

      // INITIAL rendered state: the default attack label is 'Attack'.
      await expect(attackLabel, 'initial attack label is Attack').toContainText('Attack');

      // Mutate the underlying item IN PLACE: read the existing attack, spread it, change only the label.
      await page.evaluate(async (actorName) => {
         const actor = game.actors.getName(actorName);
         const weapon = actor.items.contents[0];

         // Clone the existing attack array and rename the first attack's label in place.
         const attacks = foundry.utils.deepClone(weapon.system.attack);
         attacks[0].label = 'Renamed Strike';
         await weapon.update({
            system: {
               attack: attacks,
            },
         });
      }, ACTOR_NAME);

      // The rendered attack header must reflect the NEW label in place (assertions below auto-retry).
      await expect(attackLabel, 'attack label updated in place').toContainText('Renamed Strike');
      await expect(attackLabel, 'old attack label gone in place').not.toContainText('Attack');
   });
});
