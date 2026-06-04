import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * Phase 3a — custom-trait behavioral coverage on an Item sheet, driven through the live UI. Regressions
 * for four real bugs in the trait sidebar:
 *   1. `for (const [idx] in ...)` in ItemSheetSidebarTraits.svelte passed a STRING index to the trait
 *      tag, so the edit/delete handlers' strict (number === / !==) comparisons never matched: editing
 *      never replaced and deleting never removed the trait (ADD ignores the index, so it appeared fine).
 *   2. EditDeleteTag put the FontAwesome class directly on a `<button>`, whose `font-family` Foundry
 *      overrides with the UI font (higher specificity than `.fas`), so the glyph rendered as the notdef
 *      "missing" box. The fix puts the icon class on an inner `<i>` (the standard FA pattern).
 *   3. The custom-trait description (user-written) was run through `localize()` for its tooltip; it must
 *      be passed verbatim (other tags keep their localized tooltips).
 *
 * The edit dialog is selected by element-id prefix (its class is applied via `classes:[...]`).
 * The icon click targets the icon element itself (the click bubbles to the wrapping button), so the
 * selectors work whether the FA class is on the button or an inner `<i>`.
 */

// The world item, its seeded trait, and the edited name. The seeded description is deliberately a real
// localization key ("addCustomTrait" -> "Add Custom Trait") so the tooltip test can detect localization.
const ITEM_NAME = 'E2E Trait Item';
const ORIGINAL_NAME = 'E2E Original Trait';
const EDITED_NAME = 'E2E Edited Trait';
const DESCRIPTION_KEY = 'addCustomTrait';

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

      await page.evaluate(async ({ itemName, traitName, description }) => {
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
                  { name: traitName, description: description, uuid: 'e2e-trait-uuid-0' },
               ],
            },
         });
         const app = await item.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.sidebar'),
            { message: 'sheet mounted' },
         );
      }, { itemName: ITEM_NAME, traitName: ORIGINAL_NAME, description: DESCRIPTION_KEY });
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
      await page.locator('.sidebar .fa-pen-to-square').click();
      const dialog = page.locator('[id^="titan-edit-custom-trait-dialog-"]');
      await expect(dialog, 'edit-custom-trait dialog should open').toBeVisible();

      // Replace the name and apply.
      await dialog.locator('input').first().fill(EDITED_NAME);
      await dialog.locator('.buttons .button button').first().click();

      // Persisted: the trait's name changed in place (still exactly one trait). Poll the non-retrying
      // document read until the edit commits to the item's data model.
      await expect
         .poll(
            () => page.evaluate((itemName) => {
               const traits = game.items.getName(itemName)?.system?.customTrait ?? [];
               return { count: traits.length, names: traits.map((t) => t.name) };
            }, ITEM_NAME),
            { message: 'custom trait edited in place on the item' },
         )
         .toEqual({ count: 1, names: [EDITED_NAME] });

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

      // Delete via the tag's trash icon (click bubbles from the icon to the button).
      await page.locator('.sidebar .fa-trash').click();

      // Persisted: the trait array is now empty. Poll the non-retrying document read until the
      // deletion commits to the item's data model.
      await expect
         .poll(
            () => page.evaluate((itemName) =>
               (game.items.getName(itemName)?.system?.customTrait ?? []).length, ITEM_NAME),
            { message: 'custom trait removed from the item data model' },
         )
         .toBe(0);

      // Re-rendered: the tag is gone.
      await expect(
         page.locator('.sidebar').getByText(ORIGINAL_NAME),
         'deleted tag no longer renders',
      ).toHaveCount(0);

      expect(errors, `uncaught errors during delete:\n${errors.join('\n')}`).toEqual([]);
   });

   test('the edit and delete icons use the FontAwesome font (glyphs render)', async ({ page }) => {
      // A FontAwesome glyph only renders when its element resolves to the FA font family; on a bare
      // `<button>` Foundry's UI font wins and the glyph falls back to the notdef box. Assert the element
      // bearing each icon class resolves to a "Font Awesome" family.
      const families = await page.evaluate(() => {
         const sidebar = document.querySelector('.sidebar');
         const edit = sidebar?.querySelector('.fa-pen-to-square');
         const del = sidebar?.querySelector('.fa-trash');
         return {
            edit: edit ? getComputedStyle(edit).fontFamily : null,
            delete: del ? getComputedStyle(del).fontFamily : null,
         };
      });
      expect(families.edit, 'edit icon font-family').toMatch(/Font Awesome/i);
      expect(families.delete, 'delete icon font-family').toMatch(/Font Awesome/i);
   });

   test('the custom-trait description tooltip is shown verbatim, not localized', async ({ page }) => {
      // The seeded description is a real localization key; if it were localized the tooltip would read
      // its localized value instead of the raw user text. Read the label's tippy content directly.
      const tooltipContent = await page.evaluate((name) => {
         const candidates = document.querySelectorAll('.sidebar .tag *');
         for (const el of candidates) {
            if (el._tippy && el.textContent.trim() === name) {
               return el._tippy.props.content;
            }
         }
         return null;
      }, ORIGINAL_NAME);

      // Verbatim user text — NOT localize('addCustomTrait') === 'Add Custom Trait'.
      expect(tooltipContent, 'tooltip shows the raw description, not its localization').toBe(DESCRIPTION_KEY);
   });

   test('the edit dialog carries its stable CSS class', async ({ page }) => {
      // The edit dialog must apply `titan-edit-custom-trait-dialog` via `classes:[...]` (the
      // `_getDialogClasses()` override is dead in v14), matching the add dialog.
      await page.locator('.sidebar .fa-pen-to-square').click();
      await expect(
         page.locator('[id^="titan-edit-custom-trait-dialog-"]'),
         'edit dialog should open',
      ).toBeVisible();
      await expect(
         page.locator('.titan-edit-custom-trait-dialog'),
         'edit dialog should carry its stable class',
      ).toBeVisible();
   });
});
