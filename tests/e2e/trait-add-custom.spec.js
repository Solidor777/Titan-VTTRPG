import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';

/**
 * First behavioral vertical slice: the "Add Custom Trait" flow on an Item, driven entirely through
 * the live UI. This proves the e2e harness can catch a real regression end to end: the sidebar
 * "+" button opens AddCustomTraitDialog, the name input and "Add Trait" button commit a trait, and
 * the trait must both persist to `item.system.customTrait` and render as a tag in the sidebar.
 *
 * Confirmed against source:
 * `ItemSheetSidebarTraits.svelte` renders an `IconLabelButton` labelled `addCustomTrait` whose
 * onclick calls `document.data.addCustomTrait()` -> `TitanItem.addCustomTrait()` (owner-gated) ->
 * `new AddCustomTraitDialog(item).render(true)`.
 * `AddCustomTraitDialog` applies the class `titan-add-custom-item-trait-dialog`.
 * `AddCustomTraitDialogShell.svelte` exposes a single `TextInput` (the trait name, rendered as
 * `<input>`) and an "Add Trait" `Button` (first button under `.buttons`) whose handler pushes the
 * new trait onto `item.system.customTrait` and calls `item.update(...)`.
 * `ItemSheetCustomTraitTag.svelte` renders the persisted trait's name via `EditDeleteTag`.
 */

// The world item the trait is added to, and the trait name typed into the dialog.
const ITEM_NAME = 'E2E Trait Item';
const TRAIT_NAME = 'E2E Custom Trait';

test.describe('add custom trait on items', () => {
   // Log in as the dedicated test GM, then build a clean weapon item and open its sheet.
   test.beforeEach(async ({ page }) => {
      // Capture uncaught page errors from the start so a fatal load break is surfaced verbatim.
      const bootErrors = [];
      page.on('pageerror', (err) => {
         bootErrors.push(err.message);
      });

      await login(page);

      // Precondition: the TITAN system must have initialized and registered item data models.
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Item?.dataModels?.weapon);
      expect(ready, `TITAN system failed to initialize.\n${bootErrors.join('\n')}`).toBe(true);

      // Rebuild the fixture item from scratch and render its sheet inside the Foundry runtime.
      await page.evaluate(async (itemName) => {
         // Remove any stale fixture so each run starts from a clean, known item.
         const stale = game.items.getName(itemName);
         if (stale) {
            await stale.delete();
         }

         // A weapon carries the shared `customTrait` array from TitanItemDataModel.
         const item = await Item.create({ name: itemName, type: 'weapon' });
         const app = await item.sheet.render(true);

         // Allow the Svelte mount and ApplicationV2 render cycle to settle.
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'sheet mounted' },
         );
      }, ITEM_NAME);
   });

   // Drive the full UI flow and assert the trait both persists and renders.
   test('+ button opens the dialog; Add Trait persists and renders the trait', async ({ page }) => {
      // Collected uncaught page errors fired during the interaction window.
      const errors = [];
      page.on('pageerror', (err) => {
         errors.push(err.message);
      });

      // Open the Add Custom Trait dialog via the sidebar button (localized label "Add Custom Trait").
      await page.getByText('Add Custom Trait', { exact: true }).first().click();

      // The dialog must appear with its identifying class.
      const dialog = page.locator('.titan-add-custom-item-trait-dialog');
      await expect(dialog, 'add-custom-trait dialog should open').toBeVisible();

      // Type the trait name into the dialog's sole text input.
      await dialog.locator('input').first().fill(TRAIT_NAME);

      // Click "Add Trait" — the first button under the dialog's button row.
      await dialog.locator('.buttons .button button').first().click();

      // Allow the update + re-render cycle to settle.
      await page.waitForTimeout(500);

      // Assert: the trait persisted to the item's data model exactly once, under the typed name.
      const persisted = await page.evaluate((itemName) => {
         const item = globalThis.game.items.getName(itemName);
         const traits = item?.system?.customTrait ?? [];
         return {
            count: traits.length,
            names: traits.map((t) => t.name),
         };
      }, ITEM_NAME);

      expect(persisted.count, 'exactly one custom trait should be persisted').toBe(1);
      expect(persisted.names, 'persisted trait carries the typed name').toContain(TRAIT_NAME);

      // Assert: the trait renders as a tag in the sidebar carrying its name.
      await expect(
         page.getByText(TRAIT_NAME).first(),
         'the new trait should render as a sidebar tag',
      ).toBeVisible();

      // No uncaught errors may have fired during the add-trait interaction.
      expect(errors, `uncaught errors during add-custom-trait flow:\n${errors.join('\n')}`).toEqual([]);
   });
});
