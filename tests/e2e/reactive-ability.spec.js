import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';

/**
 * Reactivity anchor: a character-sheet ability row reads several display values (rarity, xpCost, etc.)
 * directly off the `item` Document prop iterated from `document.data.items`. Svelte 5 fine-grained
 * reactivity only tracks reads routed through the reactive `document.data` store, so a plain prop read of
 * `item.system.x` has no reactive dependency. When the underlying item is mutated in place (no tab switch,
 * no re-expand) the rendered control must update; if it stays stale the bug class is confirmed for item
 * rows. This spec seeds one ability, expands it, then mutates rarity (common -> rare) and xpCost (0 -> 5)
 * in place and asserts the rendered footer reflects the new values.
 */

/** @type {string} - Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Reactive Ability Actor';

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

test.describe('character sheet ability row reactivity', () => {
   test.beforeEach(async () => {
      await page.evaluate(async (actorName) => {
         // Remove any stale fixture from a prior run.
         const stale = game.actors.getName(actorName);
         if (stale) {
            await stale.delete();
         }

         // Seed a fresh player actor with one ability whose initial display state is known:
         // rarity 'common' (RarityTag class .common) and xpCost 0 (StatTag absent via {#if xpCost}).
         const actor = await Actor.create({ name: actorName, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [
            {
               name: 'E2E Reactive Ability',
               type: 'ability',
               system: {
                  rarity: 'common',
                  xpCost: 0,
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

   test('ability footer display values update in place after an in-place item update', async () => {
      // Activate the Abilities tab; the row click below auto-waits for the rendered row.
      await page.getByText('Abilities', { exact: true }).first().click();

      // The first ability row.
      const row = page.locator('[data-item-id]').first();

      // Expand the row in place (the expand button is the first button in the header label area).
      await row.locator('.header .label .button button').first().click();

      // The expandable footer's tag container, plus the two drivable display reads we assert on:
      // the RarityTag root (class carries the rarity key) and the xpCost StatTag value.
      const tags = row.locator('.section.tags');
      const rarityCommon = tags.locator('.tag.common');
      const rarityRare = tags.locator('.tag.rare');
      const xpCostValue = tags.locator('.tag .value');

      // INITIAL rendered state: rarity 'common' shown, xpCost StatTag absent (xpCost is 0).
      await expect(rarityCommon, 'initial rarity tag is common').toHaveCount(1);
      await expect(rarityRare, 'initial rarity tag is not rare').toHaveCount(0);
      await expect(xpCostValue, 'initial xpCost StatTag absent (xpCost 0)').toHaveCount(0);

      // Mutate the underlying item IN PLACE: do not switch tabs or collapse the row.
      await page.evaluate(async (actorName) => {
         const actor = game.actors.getName(actorName);
         await actor.items.contents[0].update({
            system: {
               rarity: 'rare',
               xpCost: 5,
            },
         });
      }, ACTOR_NAME);

      // The rendered footer must reflect the NEW values in place (assertions below auto-retry).
      await expect(rarityRare, 'rarity tag updated to rare in place').toHaveCount(1);
      await expect(rarityCommon, 'rarity tag no longer common in place').toHaveCount(0);
      await expect(xpCostValue, 'xpCost StatTag now present in place').toHaveCount(1);
      await expect(xpCostValue, 'xpCost StatTag shows 5 in place').toHaveText('5');
   });
});
