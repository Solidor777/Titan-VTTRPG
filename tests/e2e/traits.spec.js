import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Phase 3a — custom-trait edit/delete behavioral coverage on an Item sheet, driven through the live UI.
 * Regressions for two real bugs in the trait sidebar:
 *   1. `for (const [idx] in ...)` in ItemSheetSidebarTraits.svelte passed a STRING index to the trait
 *      tag, so the edit/delete handlers' strict (number === / !==) comparisons never matched: editing
 *      never replaced and deleting never removed the trait (ADD ignores the index, so it appeared fine).
 *   2. EditDeleteTag's button reset forced `font-weight: inherit`, overriding FontAwesome's required
 *      solid weight (900), so the edit/delete glyphs fell back to the notdef "missing" box.
 *
 * The edit dialog has no stable CSS class (its `_getDialogClasses()` override is dead in v14), so it is
 * selected by element-id prefix, like the check dialogs.
 */

// The world item, its seeded trait, and the edited name.
const ITEM_NAME = 'E2E Trait Item';
const ORIGINAL_NAME = 'E2E Original Trait';
const EDITED_NAME = 'E2E Edited Trait';

test.describe('custom trait edit/delete on items', () => {
   // Log in, rebuild a clean weapon seeded with one custom trait, and open its sheet.
   test.beforeEach(async ({ page }) => {
      const bootErrors = [];
      page.on('pageerror', (err) => {
         bootErrors.push(err.message);
      });

      await login(page);

      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Item?.dataModels?.weapon);
      expect(ready, `TITAN system failed to initialize.\n${bootErrors.join('\n')}`).toBe(true);

      await page.evaluate(async ({ itemName, traitName }) => {
         const stale = game.items.getName(itemName);
         if (stale) {
            await stale.delete();
         }

         // Seed one custom trait directly (data), so edit/delete are exercised in isolation.
         const item = await Item.create({
            name: itemName,
            type: 'weapon',
            system: {
               customTrait: [
                  { name: traitName, description: 'seeded', uuid: 'e2e-trait-uuid-0' },
               ],
            },
         });
         await item.sheet.render(true);
         await new Promise((resolve) => {
            setTimeout(resolve, 500);
         });
      }, { itemName: ITEM_NAME, traitName: ORIGINAL_NAME });
   });

   test('editing a custom trait persists the new name and re-renders the tag', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => {
         errors.push(err.message);
      });

      // The seeded trait renders in the sidebar.
      await expect(
         page.locator('.sidebar').getByText(ORIGINAL_NAME).first(),
         'seeded trait should render',
      ).toBeVisible();

      // Open the edit dialog via the tag's edit (pen) icon, selecting the dialog by id prefix.
      await page.locator('.sidebar button.fa-pen-to-square').click();
      const dialog = page.locator('[id^="titan-edit-custom-trait-dialog-"]');
      await expect(dialog, 'edit-custom-trait dialog should open').toBeVisible();

      // Replace the name and apply.
      await dialog.locator('input').first().fill(EDITED_NAME);
      await dialog.locator('.buttons .button button').first().click();
      await page.waitForTimeout(500);

      // Persisted: the trait's name changed in place (still exactly one trait).
      const persisted = await page.evaluate((itemName) => {
         const traits = game.items.getName(itemName)?.system?.customTrait ?? [];
         return { count: traits.length, names: traits.map((t) => t.name) };
      }, ITEM_NAME);
      expect(persisted.count, 'still exactly one trait after edit').toBe(1);
      expect(persisted.names, 'trait name was edited in place').toEqual([EDITED_NAME]);

      // Re-rendered: the sidebar shows the new name and no longer the old one.
      await expect(
         page.locator('.sidebar').getByText(EDITED_NAME).first(),
         'edited name renders',
      ).toBeVisible();
      await expect(
         page.locator('.sidebar').getByText(ORIGINAL_NAME),
         'old name no longer renders',
      ).toHaveCount(0);

      expect(errors, `uncaught errors during edit:\n${errors.join('\n')}`).toEqual([]);
   });

   test('deleting a custom trait removes it and re-renders without the tag', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => {
         errors.push(err.message);
      });

      await expect(
         page.locator('.sidebar').getByText(ORIGINAL_NAME).first(),
         'seeded trait should render',
      ).toBeVisible();

      // Delete via the tag's trash icon.
      await page.locator('.sidebar button.fa-trash').click();
      await page.waitForTimeout(500);

      // Persisted: the trait array is now empty.
      const count = await page.evaluate((itemName) =>
         (game.items.getName(itemName)?.system?.customTrait ?? []).length, ITEM_NAME);
      expect(count, 'trait removed from the data model').toBe(0);

      // Re-rendered: the tag is gone.
      await expect(
         page.locator('.sidebar').getByText(ORIGINAL_NAME),
         'deleted tag no longer renders',
      ).toHaveCount(0);

      expect(errors, `uncaught errors during delete:\n${errors.join('\n')}`).toEqual([]);
   });

   test('the edit and delete icons render at FontAwesome solid weight (900)', async ({ page }) => {
      // FontAwesome Free solid glyphs only exist at weight 900; a lighter weight falls back to the
      // notdef "missing" box. Assert the icon buttons compute to weight 900.
      const weights = await page.evaluate(() => {
         const sidebar = document.querySelector('.sidebar');
         const edit = sidebar?.querySelector('button.fa-pen-to-square');
         const del = sidebar?.querySelector('button.fa-trash');
         return {
            edit: edit ? getComputedStyle(edit).fontWeight : null,
            delete: del ? getComputedStyle(del).fontWeight : null,
         };
      });
      expect(weights.edit, 'edit icon font-weight').toBe('900');
      expect(weights.delete, 'delete icon font-weight').toBe('900');
   });
});
