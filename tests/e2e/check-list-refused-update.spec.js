import { expect, test } from './harness.js';
import { login, openSheetByUuid } from './fixtures.js';
import { addCheck, createActor, createOwnedItem, readServerSystem } from './flows.js';
import { commitText, dragGrip } from './actions.js';
import { settle } from './settle.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * A change to an item's checks (add, delete, reorder) that an update hook refuses leaves the item, its sheet and the
 * next edit as they were. The item and its checks are made through the real flows; the refusal is a `preUpdateItem`
 * listener that returns false for the item, the way a module vetoes an update, because no flow refuses an update on
 * demand. Each test then edits another check through the sheet: that edit saves the whole `system` of the live model,
 * so a change the refused update left in the model is saved by it.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The id of the actor that owns the weapons of the tests. */
let actorId;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   actorId = await createActor(page, {
      name: 'E2E Refused Update Actor',
      type: 'player',
   });
});

test.afterEach(async () => {
   await page.evaluate(() => {
      if (globalThis.titanVeto) {
         Hooks.off('preUpdateItem', globalThis.titanVeto.id);
         delete globalThis.titanVeto;
      }
   });
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Makes a weapon with stored checks and opens its sheet on the Checks tab.
 * @param {string} name - The weapon's display name.
 * @param {string[]} labels - The labels typed into the checks to add.
 * @returns {Promise<{uuid: string, sheet: import('@playwright/test').Locator}>} The weapon's uuid and its sheet.
 */
async function weaponWithChecks(name, labels) {
   /** @type {string} The weapon's id. */
   const itemId = await createOwnedItem(page, actorId, 'weapon', name);

   /** @type {string} The weapon's uuid. */
   const uuid = `Actor.${actorId}.Item.${itemId}`;
   for (const label of labels) {
      await addCheck(page, uuid, { label });
   }
   return {
      uuid,
      sheet: await openSheetByUuid(page, uuid),
   };
}

/**
 * Starts refusing every update of an item, as a `preUpdateItem` listener returning false does.
 * @param {string} uuid - The uuid of the item whose updates are refused.
 * @returns {Promise<void>} Resolves once the listener is registered.
 */
async function refuseUpdates(uuid) {
   await page.evaluate((uuid) => {
      globalThis.titanVeto = {
         refused: 0,
         id: Hooks.on('preUpdateItem', (item) => {
            if (item.uuid === uuid) {
               globalThis.titanVeto.refused++;
               return false;
            }
         }),
      };
   }, uuid);
}

/**
 * Stops refusing updates.
 * @returns {Promise<number>} The number of updates the listener refused.
 */
async function allowUpdates() {
   return page.evaluate(() => {
      Hooks.off('preUpdateItem', globalThis.titanVeto.id);
      const { refused } = globalThis.titanVeto;
      delete globalThis.titanVeto;
      return refused;
   });
}

/**
 * Reads which check rows show their expandable content.
 * @param {import('@playwright/test').Locator} rows - The check rows.
 * @returns {Promise<boolean[]>} Whether each row, in rendered order, is expanded.
 */
function readExpansion(rows) {
   return rows.evaluateAll(
      (elements) => elements.map((element) => element.querySelector('.expandable-content') !== null),
   );
}

test('a refused Add Check leaves no check in the model for the next edit to save', async () => {
   const { uuid, sheet } = await weaponWithChecks('E2E Refused Add Weapon', ['E2E Refused Add A']);
   await refuseUpdates(uuid);
   await sheet.getByRole('button', { name: 'Add Check' }).click();
   await settle(page);
   expect(await allowUpdates(), 'the add check update was refused').toBeGreaterThan(0);

   /** @type {import('@playwright/test').Locator} The check rows. */
   const rows = sheet.locator('li.reorder-row');
   await commitText(rows.nth(0).locator('.header .label input'), 'E2E Refused Add Edited');
   await expect.poll(
      async () => (await readServerSystem(page, uuid)).check.map((check) => check.label),
      { message: 'the edit saved one check' },
   ).toEqual(['E2E Refused Add Edited']);
});

test('a refused Delete leaves the check and its expansion state for the next edit to save', async () => {
   const { uuid, sheet } = await weaponWithChecks('E2E Refused Delete Weapon', [
      'E2E Refused Delete A',
      'E2E Refused Delete B',
   ]);

   /** @type {import('@playwright/test').Locator} The check rows. */
   const rows = sheet.locator('li.reorder-row');
   await expect(rows, 'both checks render').toHaveCount(2);
   await rows.nth(1).getByRole('button', { name: 'Collapse' }).click();
   await settle(page, { transitions: true });
   expect(await readExpansion(rows), 'the first row is expanded and the second collapsed').toEqual([
      true,
      false,
   ]);
   await refuseUpdates(uuid);
   await rows.nth(0).getByRole('button', {
      name: 'Delete',
      exact: true,
   }).click();
   await settle(page, { transitions: true });
   expect(await allowUpdates(), 'the delete update was refused').toBeGreaterThan(0);
   expect(await readExpansion(rows), 'the expansion state is as before the refused delete').toEqual([
      true,
      false,
   ]);
   await commitText(rows.nth(1).locator('.header .label input'), 'E2E Refused Delete B Edited');
   await expect.poll(
      async () => (await readServerSystem(page, uuid)).check.map((check) => check.label),
      { message: 'the edit saved both checks' },
   ).toEqual([
      'E2E Refused Delete A',
      'E2E Refused Delete B Edited',
   ]);
});

test('a refused reorder leaves the expansion state with its rows', async () => {
   const { uuid, sheet } = await weaponWithChecks('E2E Refused Move Weapon', [
      'E2E Refused Move A',
      'E2E Refused Move B',
      'E2E Refused Move C',
   ]);

   /** @type {import('@playwright/test').Locator} The check rows. */
   const rows = sheet.locator('li.reorder-row');

   // The window is made tall so that all three rows show at once; at the default height a drag from the first row's
   // grip to the last row moved nothing (the same setup as `drag.spec.js`).
   await page.evaluate(
      (id) => foundry.applications.instances.get(id).setPosition({
         top: 10,
         height: 1000,
      }),
      await sheet.getAttribute('id'),
   );
   await expect(rows, 'three checks render').toHaveCount(3);
   await rows.nth(2).getByRole('button', { name: 'Collapse' }).click();
   await settle(page, { transitions: true });
   await rows.nth(0).getByRole('button', { name: 'Collapse' }).click();
   await settle(page, { transitions: true });
   expect(await readExpansion(rows), 'the middle row is the only expanded one').toEqual([
      false,
      true,
      false,
   ]);
   await refuseUpdates(uuid);
   await dragGrip(rows.nth(0), rows.nth(2), 'bottom');
   expect(await allowUpdates(), 'the reorder update was refused').toBeGreaterThan(0);
   expect(await readExpansion(rows), 'the expansion state is as before the refused reorder').toEqual([
      false,
      true,
      false,
   ]);
   expect(
      (await readServerSystem(page, uuid)).check.map((check) => check.label),
      'the stored order is unchanged',
   ).toEqual([
      'E2E Refused Move A',
      'E2E Refused Move B',
      'E2E Refused Move C',
   ]);
});
