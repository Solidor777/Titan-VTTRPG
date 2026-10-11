import { expect, test } from './harness.js';
import { clickSheetTab } from './actions.js';
import { login, openSheetByUuid } from './fixtures.js';
import { addCheck, addRulesElement, createWorldItem, readServerSystem } from './flows.js';
import { settle } from './settle.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * Opening a sheet never writes to its document. A select whose stored value is not among its options shows the first
 * option; that correction is a display change until the user edits something, and is not saved by the open.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared after each test). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Starts counting the document updates the client sends to the database backend (an observation wrapper; nothing is
 * changed).
 * @returns {Promise<void>} Resolves once the counter runs.
 */
async function startCountingUpdates() {
   await page.evaluate(() => {
      /** @type {object} The client's database backend. */
      const backend = CONFIG.DatabaseBackend;

      /** @type {Function} The backend's own update method. */
      const original = backend.update;
      globalThis.titanUpdateCalls = 0;
      backend.update = function(...args) {
         globalThis.titanUpdateCalls++;
         return original.apply(this, args);
      };
   });
}

/**
 * Stops the update counter and returns what it counted.
 * @returns {Promise<number>} How many updates were sent while it ran.
 */
async function stopCountingUpdates() {
   return page.evaluate(() => {
      delete CONFIG.DatabaseBackend.update;
      return globalThis.titanUpdateCalls;
   });
}

test.describe('opening a sheet writes nothing', () => {
   test('the Rapid Fire sheet in the locked compendium opens with no error and no update', async () => {
      /** @type {string} The uuid of the Rapid Fire ability in the module's abilities pack. */
      const uuid = await page.evaluate(async () => {
         /** @type {CompendiumCollection} The module's abilities pack. */
         const pack = game.packs.get('titan-vttrpg-compendium.abilities');
         return (await pack.getIndex()).find((entry) => entry.name === 'Rapid Fire').uuid;
      });
      await startCountingUpdates();
      const sheet = await openSheetByUuid(page, uuid);
      await clickSheetTab(sheet, 'Checks');
      await settle(page, { transitions: true });
      expect(await stopCountingUpdates(), 'no update was sent').toBe(0);
      await expect(page.locator('#notifications .notification.error'), 'no error notification').toHaveCount(0);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('a world ability whose Damage Reduced By is not among its options is not saved by the open', async () => {
      /** @type {string} The new ability's uuid. */
      const uuid = `Item.${await createWorldItem(page, {
         name: 'E2E Open Writes Nothing',
         type: 'ability',
      })}`;
      await addCheck(page, uuid, {
         label: 'E2E Open Check',
         isDamage: true,
         resistanceCheck: 'reflexes',
      });

      // The sheet addCheck left open would repair the value live; the data is stored while no sheet is open.
      await closeAllApps(page);

      // Stored data no control can produce: the opposed check is off, so the select offers only none and the
      // resistance check.
      await page.evaluate(async (uuid) => {
         /** @type {TitanItem} The ability. */
         const item = await fromUuid(uuid);

         /** @type {object[]} The checks with the stored value changed. */
         const check = item.toObject().system.check;
         check[0].damageReducedBy = 'opposedCheck';
         await item.update({ 'system.check': check });
      }, uuid);
      expect((await readServerSystem(page, uuid)).check[0].damageReducedBy, 'the invalid value is stored')
         .toBe('opposedCheck');
      await closeAllApps(page);
      errors.length = 0;

      await startCountingUpdates();
      const sheet = await openSheetByUuid(page, uuid);
      await clickSheetTab(sheet, 'Checks');
      await expect(sheet.getByText('Damage Reduced By', { exact: true }), 'the select is shown').toBeVisible();
      await settle(page, { transitions: true });
      expect(await stopCountingUpdates(), 'no update was sent').toBe(0);
      expect((await readServerSystem(page, uuid)).check[0].damageReducedBy, 'the stored value is untouched')
         .toBe('opposedCheck');
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   for (const [operation, testId] of [
      [
         'mulBase',
         'mulbase-rounding',
      ],
      [
         'mulSum',
         'mulsum-rounding',
      ],
   ]) {
      test(`a ${operation} element with no stored rounding shows Round Down and is not saved by the open`, async () => {
         /** @type {string} The new weapon's uuid. */
         const uuid = `Item.${await createWorldItem(page, {
            name: `E2E Open Writes Nothing ${operation}`,
            type: 'weapon',
         })}`;
         await addRulesElement(page, uuid, { operation });
         await closeAllApps(page);

         // Stored data no control can produce: an element with no rounding, which the engine rounds down.
         await page.evaluate(async (uuid) => {
            /** @type {TitanItem} The weapon. */
            const item = await fromUuid(uuid);

            /** @type {object[]} The rules elements with the rounding removed. */
            const elements = item.toObject().system.rulesElement;
            delete elements[0].rounding;
            await item.update({ 'system.rulesElement': elements }, {
               diff: false,
               recursive: false,
            });
         }, uuid);
         expect((await readServerSystem(page, uuid)).rulesElement[0], 'the rounding is not stored')
            .not.toHaveProperty('rounding');
         await closeAllApps(page);
         errors.length = 0;

         await startCountingUpdates();
         const sheet = await openSheetByUuid(page, uuid);
         await clickSheetTab(sheet, await page.evaluate(() => game.i18n.localize('LOCAL.rulesElements.text')));
         await expect(sheet.getByTestId(testId), 'the rounding select shows the engine default').toHaveAttribute(
            'data-value',
            'down',
         );
         await expect(sheet.getByTestId(testId)).toContainText('Round Down');
         await settle(page, { transitions: true });
         expect(await stopCountingUpdates(), 'no update was sent').toBe(0);
         expect((await readServerSystem(page, uuid)).rulesElement[0], 'the rounding is still not stored')
            .not.toHaveProperty('rounding');
         expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
      });
   }
});
