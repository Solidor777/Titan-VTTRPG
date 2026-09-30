import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { login, openSheetTab } from './fixtures.js';
import { attachPageErrors, closeAllApps } from './world.js';
import { readTitanSelectValue, selectTitanOption, titanSelectOptionValues } from './select.js';

/**
 * The mulBase and mulSum editors' rounding select offers every rounding direction and stores the chosen one, and an
 * element with no stored rounding opens as `down`, the engine's default, so opening the editor never changes what the
 * engine applies.
 */

/** @type {string} Name of the world ability item this spec edits. */
const ITEM_NAME = 'E2E Rounding Editor';

/**
 * The rounding directions, read from their single source (`ROUNDING_DIRECTIONS`) so the expectation follows the code.
 * @type {string[]}
 */
const ROUNDING_DIRECTIONS = [
   ...readFileSync(fileURLToPath(new URL('../../src/helpers/utility-functions/RoundDirectional.js', import.meta.url)),
      'utf-8')
      .match(/ROUNDING_DIRECTIONS = Object\.freeze\(\[([\s\S]*?)\]\)/)[1]
      .matchAll(/'(\w+)'/g),
].map((match) => match[1]);

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
   // Rebuild the item with one mulBase and one mulSum element and open its Rules Elements tab.
   await page.evaluate(async (name) => {
      await game.items.getName(name)?.delete();
      await Item.create({
         name,
         type: 'ability',
         system: {
            rulesElement: [
               {
                  key: 'body',
                  operation: 'mulBase',
                  rounding: 'down',
                  selector: 'attribute',
                  uuid: 'e2e-rounding-mulbase',
                  value: 2,
               },
               {
                  key: 'stride',
                  operation: 'mulSum',
                  rounding: 'up',
                  selector: 'speed',
                  uuid: 'e2e-rounding-mulsum',
                  value: 0.5,
               },
            ],
         },
      });
   }, ITEM_NAME);
   await openRulesElements();
   await expect(sheet().getByTestId('mulbase-rounding')).toBeVisible();
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate((name) => game.items.getName(name)?.delete(), ITEM_NAME);
   await page?.close();
});

/**
 * Renders the item's sheet and opens its Rules Elements tab.
 * @returns {Promise<void>} Resolves once the tab is open.
 */
async function openRulesElements() {
   await page.evaluate(async (name) => {
      /** @type {TitanItemSheet} The rendered item sheet. */
      const app = await game.items.getName(name).sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('.window-content')?.children.length,
         { message: 'sheet mounted' },
      );
   }, ITEM_NAME);

   /** @type {string} The localized Rules Elements tab label. */
   const label = await page.evaluate(() => game.i18n.localize('LOCAL.rulesElements.text'));
   await openSheetTab(page, label);
}

/**
 * Locates the open item sheet.
 * @returns {import('@playwright/test').Locator} The sheet window.
 */
function sheet() {
   return page.locator('.application.titan-document-sheet');
}

/**
 * Reads the stored rounding of one of the item's rules elements.
 * @param {number} index - The element's index.
 * @returns {Promise<string>} The element's `rounding`.
 */
function readRounding(index) {
   return page.evaluate(
      ({ name, elementIndex }) => game.items.getName(name).system.rulesElement[elementIndex].rounding,
      {
         elementIndex: index,
         name: ITEM_NAME,
      },
   );
}

for (const [testId, index] of [
   [
      'mulbase-rounding',
      0,
   ],
   [
      'mulsum-rounding',
      1,
   ],
]) {
   test(`the ${testId} select offers every rounding direction and stores nearest`, async () => {
      /** @type {import('@playwright/test').Locator} The rounding select's trigger. */
      const trigger = sheet().getByTestId(testId);
      expect(await titanSelectOptionValues(page, trigger)).toEqual(ROUNDING_DIRECTIONS);

      await selectTitanOption(page, trigger, 'nearest');
      await expect.poll(() => readRounding(index), { message: 'nearest is stored' }).toBe('nearest');
      expect(await readTitanSelectValue(trigger)).toBe('nearest');
   });
}

for (const [testId, element] of [
   [
      'mulbase-rounding',
      {
         key: 'body',
         operation: 'mulBase',
         selector: 'attribute',
         uuid: 'e2e-rounding-default',
         value: 2,
      },
   ],
   [
      'mulsum-rounding',
      {
         key: 'stride',
         operation: 'mulSum',
         selector: 'speed',
         uuid: 'e2e-rounding-default',
         value: 0.5,
      },
   ],
]) {
   test(`a ${element.operation} element with no stored rounding opens and stays down, the engine default`, async () => {
      // With the sheet closed nothing writes the element, so its missing rounding is observed before the editor opens.
      await closeAllApps(page);
      await page.evaluate(async ({ name, rulesElement }) => {
         await game.items.getName(name).update({ system: { rulesElement: [rulesElement] } });
      }, {
         name: ITEM_NAME,
         rulesElement: element,
      });
      expect(await readRounding(0)).toBeUndefined();

      // Opening the editor clamps the unlisted value to the first option, down, and persists it.
      await openRulesElements();
      await expect.poll(() => readRounding(0), { message: 'the editor keeps the engine default' }).toBe('down');
      expect(await readTitanSelectValue(sheet().getByTestId(testId))).toBe('down');
   });
}
