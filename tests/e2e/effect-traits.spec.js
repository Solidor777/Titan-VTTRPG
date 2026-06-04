import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * Phase 3a Concern A — custom-trait edit/delete on an Effect sheet. Effects reuse the same (now-fixed)
 * `ItemSheetSidebar`/`ItemSheetSidebarTraits`/`EditDeleteTag` as items and call the equivalent methods on
 * `TitanActiveEffect`, so this locks in that the trait-sidebar fixes apply to effects too.
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

const ACTOR_NAME = 'E2E Effect Trait Actor';
const ORIGINAL_NAME = 'E2E Original Effect Trait';
const EDITED_NAME = 'E2E Edited Effect Trait';

test.describe('custom trait edit/delete on effects', () => {
   test.beforeEach(async () => {
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(ready, `TITAN system failed to initialize.\n${errors.join('\n')}`).toBe(true);

      // Rebuild a character carrying one effect seeded with a custom trait, then render the effect sheet.
      await page.evaluate(async ({ actorName, traitName }) => {
         const stale = game.actors.getName(actorName);
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create({ name: actorName, type: 'player' });
         const [effect] = await actor.createEmbeddedDocuments('ActiveEffect', [
            {
               name: 'E2E Effect',
               type: 'effect',
               system: {
                  customTrait: [
                     { name: traitName, description: 'seeded', uuid: 'e2e-eff-trait-0' },
                  ],
               },
            },
         ]);
         const app = await effect.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.sidebar'),
            { message: 'sheet mounted' },
         );
      }, { actorName: ACTOR_NAME, traitName: ORIGINAL_NAME });
   });

   test('editing an effect custom trait persists the new name and re-renders', async () => {
      await expect(
         page.locator('.sidebar').getByText(ORIGINAL_NAME).first(),
         'seeded effect trait should render',
      ).toBeVisible();

      await page.locator('.sidebar .fa-pen-to-square').click();
      const dialog = page.locator('[id^="titan-edit-custom-trait-dialog-"]');
      await expect(dialog, 'edit dialog should open').toBeVisible();

      await dialog.locator('input').first().fill(EDITED_NAME);
      await dialog.locator('.buttons .button button').first().click();

      // Poll the non-retrying document read until the edit commits to the effect's data model.
      await expect
         .poll(
            () => page.evaluate((actorName) =>
               game.actors.getName(actorName).effects.contents[0].system.customTrait.map((t) => t.name),
            ACTOR_NAME),
            { message: 'effect custom trait edited in place' },
         )
         .toEqual([EDITED_NAME]);

      await expect(page.locator('.sidebar').getByText(EDITED_NAME).first(), 'edited name renders').toBeVisible();
      await expect(
         page.locator('.sidebar').getByText(ORIGINAL_NAME),
         'old name no longer renders',
      ).toHaveCount(0);

      expect(errors, `uncaught errors during effect-trait edit:\n${errors.join('\n')}`).toEqual([]);
   });

   test('deleting an effect custom trait removes it and re-renders', async () => {
      await expect(
         page.locator('.sidebar').getByText(ORIGINAL_NAME).first(),
         'seeded effect trait should render',
      ).toBeVisible();

      await page.locator('.sidebar .fa-trash').click();

      // Poll the non-retrying document read until the deletion commits to the effect's data model.
      await expect
         .poll(
            () => page.evaluate((actorName) =>
               game.actors.getName(actorName).effects.contents[0].system.customTrait.length, ACTOR_NAME),
            { message: 'effect custom trait removed' },
         )
         .toBe(0);

      await expect(
         page.locator('.sidebar').getByText(ORIGINAL_NAME),
         'deleted tag no longer renders',
      ).toHaveCount(0);

      expect(errors, `uncaught errors during effect-trait delete:\n${errors.join('\n')}`).toEqual([]);
   });
});
