import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Reactivity anchor: a character-sheet spell row (`CharacterSheetSpell`) reads several footer display
 * values (rarity, tradition, xpCost, etc.) directly off the `item` Document prop iterated from
 * `document.data.items`. Svelte 5 fine-grained reactivity only tracks reads routed through the reactive
 * `document.data` store, so a plain prop read of `item.system.x` has no reactive dependency. When the
 * underlying item is mutated in place (no tab switch, no re-expand) the rendered controls must update; if
 * they stay stale the bug class is confirmed for spell rows. The tradition read also exercises the shared
 * `CharacterSheetItemTradition` tag pattern (a StatTag in the footer). This spec seeds one spell, expands
 * it, then mutates rarity (common -> rare), tradition (Arcane -> Divine) and xpCost (0 -> 5) in place and
 * asserts the rendered footer reflects the new values.
 */

/** @type {string} - Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Reactive Spell Actor';

test.describe('character sheet spell row reactivity', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
      await page.evaluate(async (actorName) => {
         // Remove any stale fixture from a prior run.
         const stale = game.actors.getName(actorName);
         if (stale) {
            await stale.delete();
         }

         // Seed a fresh player actor with one spell whose initial display state is known: rarity 'common'
         // (RarityTag class .common), tradition 'Arcane' (StatTag value), and xpCost 0 (StatTag absent via
         // {#if item.system.xpCost}).
         const actor = await Actor.create({ name: actorName, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [
            {
               name: 'E2E Reactive Spell',
               type: 'spell',
               system: {
                  rarity: 'common',
                  tradition: 'Arcane',
                  xpCost: 0,
               },
            },
         ]);

         // Render the sheet and let the Svelte mount and ApplicationV2 render cycle settle.
         await actor.sheet.render(true);
         await new Promise((resolve) => {
            setTimeout(resolve, 600);
         });
      }, ACTOR_NAME);
   });

   test('spell footer display values update in place after an in-place item update', async ({ page }) => {
      // Activate the Spells tab and let it settle.
      await page.getByText('Spells', { exact: true }).first().click();
      await page.waitForTimeout(400);

      // The first spell row.
      const row = page.locator('[data-item-id]').first();

      // Expand the row in place (the expand button is the first button in the header label area).
      await row.locator('.header .label .button button').first().click();
      await page.waitForTimeout(400);

      // The expandable footer's tag container, plus the drivable display reads we assert on: the RarityTag
      // root (class carries the rarity key), the Tradition StatTag (matched by its 'Tradition' label) and
      // the xpCost StatTag (matched by its 'XP Cost' label).
      const tags = row.locator('.section.tags.small-text');
      const rarityCommon = tags.locator('.tag.common');
      const rarityRare = tags.locator('.tag.rare');

      // StatTag labels are unique within the footer, so locate each StatTag by its `.label` text and read
      // the adjacent `.value` (the label's following sibling) for the displayed value.
      const traditionLabel = tags.locator('.tag > .label', { hasText: 'Tradition' });
      const traditionValue = traditionLabel.locator('xpath=following-sibling::div[@class="value"]');
      const xpCostLabel = tags.locator('.tag > .label', { hasText: 'XP Cost' });
      const xpCostValue = xpCostLabel.locator('xpath=following-sibling::div[@class="value"]');

      // INITIAL rendered state: rarity 'common' shown, tradition 'Arcane', xpCost StatTag absent (xpCost 0).
      await expect(rarityCommon, 'initial rarity tag is common').toHaveCount(1);
      await expect(rarityRare, 'initial rarity tag is not rare').toHaveCount(0);
      await expect(traditionValue, 'initial tradition is Arcane').toHaveText('Arcane');
      await expect(xpCostLabel, 'initial xpCost StatTag absent (xpCost 0)').toHaveCount(0);

      // Mutate the underlying item IN PLACE: do not switch tabs or collapse the row.
      await page.evaluate(async (actorName) => {
         const actor = game.actors.getName(actorName);
         await actor.items.contents[0].update({
            system: {
               rarity: 'rare',
               tradition: 'Divine',
               xpCost: 5,
            },
         });
      }, ACTOR_NAME);
      await page.waitForTimeout(400);

      // The rendered footer must reflect the NEW values in place.
      await expect(rarityRare, 'rarity tag updated to rare in place').toHaveCount(1);
      await expect(rarityCommon, 'rarity tag no longer common in place').toHaveCount(0);
      await expect(traditionValue, 'tradition updated to Divine in place').toHaveText('Divine');
      await expect(xpCostLabel, 'xpCost StatTag now present in place').toHaveCount(1);
      await expect(xpCostValue, 'xpCost StatTag shows 5 in place').toHaveText('5');
   });
});
