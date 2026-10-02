import { expect, test } from './harness.js';
import { login, openSheetByUuid } from './fixtures.js';
import { addCustomAspect, createWorldItem, enableAspect } from './flows.js';
import { withClients } from './multiClient.js';
import { selectTitanOption } from './select.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * The spell sheet's aspect tabs, on world spells made through the Items tab. The Inflict Condition and Remove Condition
 * aspects offer Off-Balance and price it; the Casting Check tab lists each enabled standard aspect and each custom
 * aspect with its cost, omits a disabled aspect, follows a price change made by another client while it is open, and
 * keeps its scroll position across tab switches.
 *
 * The spells are made once in `beforeAll`. A test that changes one puts the field back through the same control.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {import('@playwright/test').Browser} The browser the second client opens its context in. */
let browserHandle;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The uuid of the spell with both condition aspects enabled and no condition chosen. */
let conditionsUuid;
/** @type {string} The uuid of the spell with a range, a damage, a disabled and a custom aspect. */
let panelUuid;
/** @type {string} The uuid of the spell with enough custom aspects to overflow the Casting Check tab's list. */
let scrollUuid;

/**
 * The number of custom aspects of the spell whose Casting Check tab must scroll by more than the 40 px the test
 * scrolls. Measured at the sheet's default size
 * (`.superpowers/sdd/test-suite-rewrite/phase-3/spell-overflow-measure.log`, local): with 1 to 8 custom aspects the
 * list has no overflow, with 9 and 10 it has 2 px, with 11 and 12 it has 39 px, and with 13 and 14 it has 77 px. The
 * first count that scrolls the 40 px is 13; the count is 14, which gives the same 77 px.
 * @type {number}
 */
const SCROLL_CUSTOM_COUNT = 14;

test.beforeAll(async ({ browser }) => {
   test.setTimeout(180_000);
   browserHandle = browser;
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);

   conditionsUuid = `Item.${await createWorldItem(page, {
      name: 'E2E Spell Sheet Conditions',
      type: 'spell',
   })}`;
   await enableAspect(page, conditionsUuid, 'inflictCondition');
   await enableAspect(page, conditionsUuid, 'removeCondition');

   // The decrease modifier needs an option, so enabled without one it is stored disabled.
   panelUuid = `Item.${await createWorldItem(page, {
      name: 'E2E Spell Sheet Panel',
      type: 'spell',
   })}`;
   await enableAspect(page, panelUuid, 'range');
   await enableAspect(page, panelUuid, 'damage');
   await enableAspect(page, panelUuid, 'decreaseMod');
   await addCustomAspect(page, panelUuid);

   scrollUuid = `Item.${await createWorldItem(page, {
      name: 'E2E Spell Sheet Scroll',
      type: 'spell',
   })}`;
   for (let index = 0; index < SCROLL_CUSTOM_COUNT; index++) {
      await addCustomAspect(page, scrollUuid);
   }
   await closeAllApps(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Opens a spell's sheet on one of its tabs.
 * @param {string} uuid - The uuid of the spell whose sheet opens.
 * @param {string} tab - The tab's visible label.
 * @param {import('@playwright/test').Page} [on] - The client to open the sheet on; defaults to the shared page.
 * @returns {Promise<import('@playwright/test').Locator>} The spell sheet's window element.
 */
async function openSpellTab(uuid, tab, on = page) {
   /** @type {import('@playwright/test').Locator} The spell's sheet. */
   const sheet = await openSheetByUuid(on, uuid);
   await sheet.locator('.tab-list').getByText(tab, { exact: true }).first().click();
   return sheet;
}

test.describe('condition aspects', () => {
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
         /** @type {import('@playwright/test').Locator} The spell's sheet on the Standard Aspects tab. */
         const sheet = await openSpellTab(conditionsUuid, 'Standard Aspects');

         /** @type {import('@playwright/test').Locator} The Off-Balance option toggle. */
         const toggle = sheet.getByTestId(`spell-aspect-option-${label}-offBalance`);

         /**
          * Reads one of the spell's aspects: its derived cost and its chosen options.
          * @returns {Promise<{cost: number, option: string[]}>} The derived cost and the selected condition ids.
          */
         const readAspect = () => page.evaluate(async ({ uuid, aspectIndex }) => {
            /** @type {object} The spell aspect entry at the given index. */
            const aspect = (await fromUuid(uuid)).system.aspect[aspectIndex];
            return {
               cost: aspect.cost,
               option: [...aspect.option],
            };
         }, {
            uuid: conditionsUuid,
            aspectIndex: index,
         });

         /** @type {string} The localized Off-Balance name. */
         const offBalance = await page.evaluate(() => game.i18n.localize('LOCAL.offBalance.text'));
         await expect(toggle).toContainText(offBalance);
         await expect(toggle).toHaveClass(/(^|\s)not-enabled(\s|$)/);
         try {
            await toggle.locator('button').click();
            await expect.poll(readAspect, { message: 'Off-Balance is stored and priced' }).toEqual({
               cost,
               option: ['offBalance'],
            });
            await expect(toggle).toHaveClass(/(^|\s)enabled(\s|$)/);
         }
         finally {
            // The toggle is switched off again so the next test starts from the same spell.
            if ((await readAspect()).option.length > 0) {
               await toggle.locator('button').click();
               await expect.poll(async () => (await readAspect()).option).toEqual([]);
            }
         }
         expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
      });
   }
});

test.describe('Casting Check tab', () => {
   test('lists the aspects that make up the total cost', async () => {
      /** @type {import('@playwright/test').Locator} The spell's sheet on the Casting Check tab. */
      const sheet = await openSpellTab(panelUuid, 'Casting Check');

      /** @type {import('@playwright/test').Locator} The Aspect Costs panel. */
      const costs = sheet.locator('.aspect-costs');

      /**
       * @type {{range: string, damage: string, custom: string, customLabel: string, rangeLabel: string,
       * damageLabel: string, disabledLabel: string}} The document's computed costs and the localized aspect labels.
       */
      const expected = await page.evaluate(async (uuid) => {
         /** @type {object} The spell's prepared system data. */
         const system = (await fromUuid(uuid)).system;
         return {
            range: String(system.aspect.find((aspect) => aspect.label === 'range').cost),
            damage: String(system.aspect.find((aspect) => aspect.label === 'damage').cost),
            custom: String(system.customAspect[0].cost),
            customLabel: system.customAspect[0].label,
            rangeLabel: game.i18n.localize('LOCAL.range.text'),
            damageLabel: game.i18n.localize('LOCAL.damage.text'),
            disabledLabel: game.i18n.localize('LOCAL.decreaseMod.text'),
         };
      }, panelUuid);

      // The decrease modifier is on the spell but disabled; the panel lists only what counts toward the total.
      expect(
         await page.evaluate(async (uuid) => (await fromUuid(uuid)).system.aspect.map((aspect) => aspect.label),
            panelUuid),
         'the spell holds the disabled aspect',
      ).toContain('decreaseMod');
      await expect(costs.locator('.tag')).toHaveCount(3);
      await expect(costs.locator('.tag .label')).toHaveText([
         expected.rangeLabel,
         expected.damageLabel,
         expected.customLabel,
      ]);
      await expect(costs.locator('.tag .value')).toHaveText([
         expected.range,
         expected.damage,
         expected.custom,
      ]);
      await expect(costs.getByText(expected.disabledLabel, { exact: true })).toHaveCount(0);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('re-prices an aspect another client changes while it is open', async () => {
      /** @type {import('@playwright/test').Locator} The spell's sheet on the Casting Check tab. */
      const sheet = await openSpellTab(panelUuid, 'Casting Check');

      /** @type {string} The localized Range aspect label. */
      const rangeLabel = await page.evaluate(() => game.i18n.localize('LOCAL.range.text'));

      /** @type {import('@playwright/test').Locator} The Range aspect's cost value in the panel. */
      const rangeValue = sheet.locator('.aspect-costs .tag', { hasText: rangeLabel }).locator('.value');
      await expect(rangeValue, 'a self-range aspect costs nothing').toHaveText('0');

      // The second client changes the range in the Standard Aspects tab, the control for it; this client's open
      // Casting Check panel follows the document.
      await withClients(browserHandle, { editor: 'E2E GM 2' }, async ({ editor }) => {
         /** @type {import('@playwright/test').Locator} The spell's sheet on the second client. */
         const editorSheet = await openSpellTab(panelUuid, 'Standard Aspects', editor);

         /** @type {import('@playwright/test').Locator} The Range aspect's initial value select. */
         const select = editorSheet.locator('.standard-aspects-tab .aspect')
            .filter({ has: editor.getByText(rangeLabel, { exact: true }) })
            .first()
            .locator('[role="combobox"]')
            .first();
         try {
            await selectTitanOption(editor, select, 10);

            /**
             * Reads the Range aspect's cost on this client as the document computes it.
             * @returns {Promise<string>} The cost as a string, as the panel's tag shows it.
             */
            const readCost = () => page.evaluate(async (uuid) => String(
               (await fromUuid(uuid)).system.aspect.find((aspect) => aspect.label === 'range').cost,
            ), panelUuid);

            // The option click returns before the other client's update arrives, so the cost is polled.
            await expect.poll(readCost, { message: 'the document re-prices the aspect' }).not.toBe('0');

            /** @type {string} The Range aspect's cost after the update. */
            const repriced = await readCost();
            await expect(rangeValue, 'the open panel follows the document').toHaveText(repriced);
         }
         finally {
            await selectTitanOption(editor, select, 'self');
            await expect(rangeValue, 'the panel follows the restored range').toHaveText('0');
         }
      });
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('keeps its aspect list scroll position across tab switches', async () => {
      /** @type {import('@playwright/test').Locator} The spell's sheet on the Casting Check tab. */
      const sheet = await openSpellTab(scrollUuid, 'Casting Check');

      /** @type {import('@playwright/test').Locator} The panel's scrolling aspect list. */
      const content = sheet.locator('.aspect-costs .content');
      await expect(content.locator('.tag')).toHaveCount(SCROLL_CUSTOM_COUNT);

      // Scroll the overflowing list and wait for the scroll event to be recorded.
      /** @type {number} How far the list can scroll. */
      const maxScroll = await content.evaluate((element) => element.scrollHeight - element.clientHeight);
      expect(maxScroll, 'the list overflows its container').toBeGreaterThan(40);
      await content.evaluate((element) => {
         element.scrollTop = 40;
      });
      await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBe(40);

      // Tabs are lazy-mounted, so leaving and returning re-mounts the container from the bound state.
      await sheet.locator('.tab-list').getByText('Standard Aspects', { exact: true }).first().click();
      await expect(content).toHaveCount(0);
      await sheet.locator('.tab-list').getByText('Casting Check', { exact: true }).first().click();
      await expect(content).toBeVisible();
      await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBe(40);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
