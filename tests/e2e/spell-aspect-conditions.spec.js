import { expect, test } from '@playwright/test';
import { login, openSheetTab } from './fixtures.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * The spell sheet's Inflict Condition and Remove Condition aspects offer Off-Balance: toggling it on stores the option
 * and prices the aspect (Inflict 3, Remove 2).
 */

/** @type {string} Name of the world spell this spec edits. */
const SPELL_NAME = 'E2E Condition Aspects';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
});

test.beforeEach(async () => {
   // Rebuild the spell with both condition aspects enabled and no condition chosen, and open its Standard Aspects tab.
   await page.evaluate(async (name) => {
      await game.items.getName(name)?.delete();

      /** @type {TitanItem} The rebuilt spell. */
      const item = await Item.create({
         name,
         type: 'spell',
         system: {
            aspect: [
               {
                  cost: 0,
                  enabled: true,
                  label: 'inflictCondition',
                  option: [],
                  resistanceCheck: 'none',
               },
               {
                  allOptions: false,
                  cost: 0,
                  enabled: true,
                  label: 'removeCondition',
                  option: [],
               },
            ],
         },
      });

      /** @type {TitanItemSheet} The rendered spell sheet. */
      const app = await item.sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('.window-content')?.children.length,
         { message: 'sheet mounted' },
      );
   }, SPELL_NAME);

   /** @type {string} The localized Standard Aspects tab label. */
   const label = await page.evaluate(() => game.i18n.localize('LOCAL.standardAspects.text'));
   await openSheetTab(page, label);
   await expect(sheet().getByTestId('spell-aspect-option-inflictCondition-offBalance')).toBeVisible();
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate((name) => game.items.getName(name)?.delete(), SPELL_NAME);
   await page?.close();
});

/**
 * Locates the open spell sheet.
 * @returns {import('@playwright/test').Locator} The sheet window.
 */
function sheet() {
   return page.locator('.application.titan-document-sheet');
}

/**
 * Reads one of the spell's aspects: its derived cost and its chosen options.
 * @param {number} index - The position of the aspect in the spell's `system.aspect` array.
 * @returns {Promise<{cost: number, option: string[]}>} The derived cost and the selected condition ids.
 */
function readAspect(index) {
   return page.evaluate(({ name, aspectIndex }) => {
      /** @type {object} The spell aspect entry at the given index. */
      const aspect = game.items.getName(name).system.aspect[aspectIndex];
      return {
         cost: aspect.cost,
         option: [...aspect.option],
      };
   }, {
      aspectIndex: index,
      name: SPELL_NAME,
   });
}

for (const [label, index, cost] of [
   [
      'inflictCondition',
      0,
      3,
   ],
   [
      'removeCondition',
      1,
      2,
   ],
]) {
   test(`the ${label} aspect offers Off-Balance and prices it at ${cost}`, async () => {
      /** @type {import('@playwright/test').Locator} The Off-Balance option toggle. */
      const toggle = sheet().getByTestId(`spell-aspect-option-${label}-offBalance`);

      /** @type {string} The localized Off-Balance name. */
      const offBalance = await page.evaluate(() => game.i18n.localize('LOCAL.offBalance.text'));
      await expect(toggle).toContainText(offBalance);
      await expect(toggle).toHaveClass(/(^|\s)not-enabled(\s|$)/);

      await toggle.locator('button').click();
      await expect.poll(() => readAspect(index), { message: 'Off-Balance is stored and priced' }).toEqual({
         cost,
         option: ['offBalance'],
      });
      await expect(toggle).toHaveClass(/(^|\s)enabled(\s|$)/);
   });
}
