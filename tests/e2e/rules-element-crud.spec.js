import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';
import { selectTitanOption } from './select.js';

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

/**
 * Phase 3a Concern B — rules-element add/delete reactivity bug hunt. The rules-element tab renders one
 * `.rules-element` row per `document.data.system.rulesElement` entry. `RulesElementMixin.addRulesElement`
 * / `deleteRulesElement` mutate the live array IN PLACE and pass the mutated reference to `update()`,
 * which can defeat `ReactiveDocument` change-detection (persists but doesn't re-render). This drives the
 * real UI and asserts both persistence AND in-place re-render. A failure here is a real engine bug; the
 * fix is a fresh array (user pre-authorized).
 */

const ITEM_NAME = 'E2E RulesElement Item';

test.describe('rules-element add/delete reactivity', () => {
   test.beforeEach(async () => {
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Item?.dataModels?.weapon);
      expect(ready, 'TITAN system failed to initialize').toBe(true);

      // Rebuild a clean weapon (no rules elements) and render its sheet.
      await page.evaluate(async (name) => {
         const stale = game.items.getName(name);
         if (stale) {
            await stale.delete();
         }
         const item = await Item.create({ name, type: 'weapon' });
         const app = await item.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'sheet mounted' },
         );
      }, ITEM_NAME);

      // Activate the Rules Elements tab so its list and Add button render.
      const label = await page.evaluate(() => game.i18n.localize('LOCAL.rulesElements.text'));
      await page.locator('.tab-list').getByText(label, { exact: true }).click();

      // The tab is active once its Add button has rendered.
      await expect(page.locator('.add-entry-button button'), 'rules-elements tab rendered').toBeVisible();
   });

   test('adding then deleting a rules element re-renders the list in place', async () => {
      const rows = page.locator('.rules-element');
      await expect(rows, 'starts with no rules elements').toHaveCount(0);

      // Add via the tab's "Add Element" button.
      await page.locator('.add-entry-button button').click();

      // Poll the non-retrying document read until the new element persists.
      await expect
         .poll(
            () => page.evaluate((name) => game.items.getName(name).system.rulesElement.length, ITEM_NAME),
            { message: 'rules element persisted' },
         )
         .toBe(1);
      await expect(rows, 'list re-rendered with the new row').toHaveCount(1);

      // Delete via the row's delete button.
      await page.locator('.rules-element .delete-button button').first().click();

      // Poll the non-retrying document read until the element is removed.
      await expect
         .poll(
            () => page.evaluate((name) => game.items.getName(name).system.rulesElement.length, ITEM_NAME),
            { message: 'rules element removed' },
         )
         .toBe(0);
      await expect(rows, 'list re-rendered without the row').toHaveCount(0);
   });
});

test.describe('rules-element selector default key', () => {
   const ITEM_NAME_SELECTOR = 'E2E RulesElement Selector Item';

   test.beforeEach(async () => {
      const ready = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Item?.dataModels?.weapon);
      expect(ready, 'TITAN system failed to initialize').toBe(true);

      // Rebuild a clean weapon (no rules elements) and render its sheet.
      await page.evaluate(async (name) => {
         const stale = game.items.getName(name);
         if (stale) {
            await stale.delete();
         }
         const item = await Item.create({ name, type: 'weapon' });
         const app = await item.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'sheet mounted' },
         );
      }, ITEM_NAME_SELECTOR);

      // Activate the Rules Elements tab so its list and Add button render.
      const label = await page.evaluate(() => game.i18n.localize('LOCAL.rulesElements.text'));
      await page.locator('.tab-list').getByText(label, { exact: true }).click();

      // The tab is active once its Add button has rendered.
      await expect(page.locator('.add-entry-button button'), 'rules-elements tab rendered').toBeVisible();
   });

   test('changing the selector resets the key to the curated default', async () => {
      // Add a flatModifier element (defaults: selector "attribute", key "body").
      await page.locator('.add-entry-button button').click();

      // Poll the non-retrying document read until the seeded default element persists.
      await expect
         .poll(
            () => page.evaluate((name) => {
               const el = game.items.getName(name).system.rulesElement[0];
               return el ? { operation: el.operation, selector: el.selector, key: el.key } : null;
            }, ITEM_NAME_SELECTOR),
            { message: 'seeded default flatModifier element persisted' },
         )
         .toEqual({
            operation: 'flatModifier',
            selector: 'attribute',
            key: 'body',
         });

      // Change the operation-specific SELECTOR dropdown to "resource".
      const operationSelect = page.locator('.rules-element .operation-settings .field.select [role="combobox"]').first();
      await selectTitanOption(page, operationSelect, 'resource');

      // The key must land on the curated default "resolve", NOT the clamp's first option "all". Poll the
      // non-retrying document read until the selector change commits the curated key.
      await expect
         .poll(
            () => page.evaluate((name) =>
               game.items.getName(name).system.rulesElement[0].key, ITEM_NAME_SELECTOR),
            { message: 'curated default key for the resource selector' },
         )
         .toBe('resolve');

      // The retired owner-guard must not have surfaced its "Cannot modify document" error toast.
      // (Foundry's own resolution/hardware-acceleration startup notices are unrelated and ignored.)
      await expect(page.locator('.notification.error', { hasText: 'Cannot modify document' }))
         .toHaveCount(0);
   });
});
