import { expect, test } from './harness.js';
import { login, openSheetByUuid } from './fixtures.js';
import { addCheck, createActor, createOwnedItem, readServerSystem } from './flows.js';
import { commitText, dragGrip } from './actions.js';
import { settle } from './settle.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * A change to an item's checks (add, delete, reorder, insert) that an update hook refuses, or that the database
 * rejects, leaves the item, its sheet and the next edit as they were. The item and its checks are made through the real
 * flows. No flow refuses or rejects an update on demand, so the tests do it for the item: a `preUpdateItem` listener
 * returning false is a module's veto (the update resolves undefined), and an `update` method that throws stands for a
 * failed database request. A rejected update is made by calling the document's own method, because the sheet's click
 * handler does not await it and would raise an unhandled rejection. Each test then edits another check through the
 * sheet: that edit saves the whole `system` of the live model, so a change the failed update left in the model is
 * saved by it.
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
         globalThis.titanVeto.release();
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
 * Intercepts the updates of one item.
 * @param {string} uuid - The uuid of the item.
 * @param {'refuse' | 'reject' | 'observe'} mode - `refuse` registers a `preUpdateItem` listener that returns false (a
 * veto), `observe` registers one that only counts, and `reject` replaces the item's `update` method with one that
 * throws, as a failed database request does.
 * @param {boolean} [held] - Whether a rejected update stays in flight until `failHeldUpdate` is called.
 * @returns {Promise<void>} Resolves once the interception is in place.
 */
async function interceptUpdates(uuid, mode, held = false) {
   await page.evaluate(async ({ uuid, mode, held }) => {
      globalThis.titanVeto = {
         attempts: 0,
         release: () => undefined,
      };
      if (mode === 'reject') {
         /** @type {foundry.documents.Item} The item, whose own `update` shadows the class method. */
         const item = await fromUuid(uuid);
         item.update = async () => {
            globalThis.titanVeto.attempts++;
            if (held) {
               await new Promise((resolve) => {
                  globalThis.titanVeto.fail = resolve;
               });
            }
            throw new Error('E2E update rejected');
         };
         globalThis.titanVeto.release = () => {
            delete item.update;
         };
         return;
      }
      /** @type {number} The id of the listener. */
      const id = Hooks.on('preUpdateItem', (item) => {
         if (item.uuid !== uuid) {
            return undefined;
         }
         globalThis.titanVeto.attempts++;
         return mode === 'refuse' ? false : undefined;
      });
      globalThis.titanVeto.release = () => Hooks.off('preUpdateItem', id);
   }, {
      uuid,
      mode,
      held,
   });
}

/**
 * Lets the held rejected update throw.
 * @returns {Promise<void>} Resolves once the update was told to fail.
 */
async function failHeldUpdate() {
   await page.evaluate(() => globalThis.titanVeto.fail());
}

/**
 * Ends the interception.
 * @returns {Promise<number>} The number of updates of the item that reached the interception.
 */
async function releaseUpdates() {
   return page.evaluate(() => {
      globalThis.titanVeto.release();
      const { attempts } = globalThis.titanVeto;
      delete globalThis.titanVeto;
      return attempts;
   });
}

/**
 * Calls a check-list method of an item and reports whether it rejected.
 * @param {string} uuid - The uuid of the item.
 * @param {'addCheck' | 'deleteCheck'} method - The method to call.
 * @param {...*} args - The method's arguments.
 * @returns {Promise<string | null>} The rejection's message, or null when the call resolved.
 */
function callRejected(uuid, method, ...args) {
   return page.evaluate(async ({ uuid, method, args }) => {
      try {
         await (await fromUuid(uuid))[method](...args);
         return null;
      }
      catch (error) {
         return error.message;
      }
   }, {
      uuid,
      method,
      args,
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
   await interceptUpdates(uuid, 'refuse');
   await sheet.getByRole('button', { name: 'Add Check' }).click();
   await settle(page);
   expect(await releaseUpdates(), 'the add check update was refused').toBe(1);

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
   await expect.poll(
      () => readExpansion(rows),
      { message: 'the first row is expanded and the second collapsed' },
   ).toEqual([
      true,
      false,
   ]);
   await interceptUpdates(uuid, 'refuse');
   await rows.nth(0).getByRole('button', {
      name: 'Delete',
      exact: true,
   }).click();
   await settle(page, { transitions: true });
   expect(await releaseUpdates(), 'the delete update was refused').toBe(1);
   await expect.poll(
      () => readExpansion(rows),
      { message: 'the expansion state is as before the refused delete' },
   ).toEqual([
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
   await expect.poll(
      () => readExpansion(rows),
      { message: 'the middle row is the only expanded one' },
   ).toEqual([
      false,
      true,
      false,
   ]);
   await interceptUpdates(uuid, 'refuse');
   await dragGrip(rows.nth(0), rows.nth(2), 'bottom');
   expect(await releaseUpdates(), 'the reorder update was refused').toBe(1);
   await expect.poll(
      () => readExpansion(rows),
      { message: 'the expansion state is as before the refused reorder' },
   ).toEqual([
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

test('a refused upward reorder leaves the expansion state with its rows', async () => {
   const { uuid, sheet } = await weaponWithChecks('E2E Refused Up Weapon', [
      'E2E Refused Up A',
      'E2E Refused Up B',
      'E2E Refused Up C',
   ]);

   /** @type {import('@playwright/test').Locator} The check rows. */
   const rows = sheet.locator('li.reorder-row');
   await page.evaluate(
      (id) => foundry.applications.instances.get(id).setPosition({
         top: 10,
         height: 1000,
      }),
      await sheet.getAttribute('id'),
   );
   await expect(rows, 'three checks render').toHaveCount(3);

   // The outer rows are collapsed so that the first row's top edge, the drop point, is inside the viewport.
   await rows.nth(2).getByRole('button', { name: 'Collapse' }).click();
   await settle(page, { transitions: true });
   await rows.nth(0).getByRole('button', { name: 'Collapse' }).click();
   await settle(page, { transitions: true });
   await expect.poll(
      () => readExpansion(rows),
      { message: 'the middle row is the only expanded one' },
   ).toEqual([
      false,
      true,
      false,
   ]);
   await interceptUpdates(uuid, 'refuse');
   await dragGrip(rows.nth(2), rows.nth(0), 'top');
   expect(await releaseUpdates(), 'the reorder update was refused').toBe(1);
   await expect.poll(
      () => readExpansion(rows),
      { message: 'the expansion state is as before the refused reorder' },
   ).toEqual([
      false,
      true,
      false,
   ]);
});

test('a refused insert leaves the expansion state with its rows', async () => {
   const source = await weaponWithChecks('E2E Refused Insert Source Weapon', ['E2E Refused Insert Source A']);
   const target = await weaponWithChecks('E2E Refused Insert Target Weapon', [
      'E2E Refused Insert Target A',
      'E2E Refused Insert Target B',
   ]);

   // The two windows open on top of each other and are made tall, so they are moved apart (a window position is not a
   // document; the same setup as `drag.spec.js`).
   await page.evaluate(([sourceId, targetId]) => {
      foundry.applications.instances.get(sourceId).setPosition({
         top: 10,
         left: 10,
         height: 1000,
      });
      foundry.applications.instances.get(targetId).setPosition({
         top: 10,
         left: 900,
         height: 1000,
      });
   }, [
      await source.sheet.getAttribute('id'),
      await target.sheet.getAttribute('id'),
   ]);

   /** @type {import('@playwright/test').Locator} The source's check rows. */
   const sourceRows = source.sheet.locator('li.reorder-row');

   /** @type {import('@playwright/test').Locator} The target's check rows. */
   const targetRows = target.sheet.locator('li.reorder-row');
   await expect(sourceRows, 'the source check renders').toHaveCount(1);
   await expect(targetRows, 'the target checks render').toHaveCount(2);
   await targetRows.nth(1).getByRole('button', { name: 'Collapse' }).click();
   await settle(page, { transitions: true });
   await expect.poll(
      () => readExpansion(targetRows),
      { message: 'the first target row is expanded and the second collapsed' },
   ).toEqual([
      true,
      false,
   ]);
   await interceptUpdates(target.uuid, 'refuse');
   await dragGrip(sourceRows.nth(0), targetRows.nth(0), 'top');
   expect(await releaseUpdates(), 'the insert update was refused').toBe(1);
   await expect.poll(
      () => readExpansion(targetRows),
      { message: 'the expansion state is as before the refused insert' },
   ).toEqual([
      true,
      false,
   ]);
   expect(
      (await readServerSystem(page, target.uuid)).check.map((check) => check.label),
      'the target stored no copy',
   ).toEqual([
      'E2E Refused Insert Target A',
      'E2E Refused Insert Target B',
   ]);
});

test('a rejected Add Check leaves no check in the model for the next edit to save', async () => {
   const { uuid, sheet } = await weaponWithChecks('E2E Rejected Add Weapon', ['E2E Rejected Add A']);
   await interceptUpdates(uuid, 'reject');
   expect(await callRejected(uuid, 'addCheck'), 'the add check update was rejected').toBe('E2E update rejected');
   expect(await releaseUpdates(), 'the rejected update reached the listener once').toBe(1);

   /** @type {import('@playwright/test').Locator} The check rows. */
   const rows = sheet.locator('li.reorder-row');
   await commitText(rows.nth(0).locator('.header .label input'), 'E2E Rejected Add Edited');
   await expect.poll(
      async () => (await readServerSystem(page, uuid)).check.map((check) => check.label),
      { message: 'the edit saved one check' },
   ).toEqual(['E2E Rejected Add Edited']);
});

test('a rejected Delete leaves the check and its expansion state for the next edit to save', async () => {
   const { uuid, sheet } = await weaponWithChecks('E2E Rejected Delete Weapon', [
      'E2E Rejected Delete A',
      'E2E Rejected Delete B',
   ]);

   /** @type {import('@playwright/test').Locator} The check rows. */
   const rows = sheet.locator('li.reorder-row');
   await expect(rows, 'both checks render').toHaveCount(2);
   await rows.nth(1).getByRole('button', { name: 'Collapse' }).click();
   await settle(page, { transitions: true });
   await interceptUpdates(uuid, 'reject');
   expect(await callRejected(uuid, 'deleteCheck', 0), 'the delete update was rejected').toBe('E2E update rejected');
   expect(await releaseUpdates(), 'the rejected update reached the listener once').toBe(1);
   await settle(page, { transitions: true });
   await expect.poll(
      () => readExpansion(rows),
      { message: 'the expansion state is as before the rejected delete' },
   ).toEqual([
      true,
      false,
   ]);
   await commitText(rows.nth(1).locator('.header .label input'), 'E2E Rejected Delete B Edited');
   await expect.poll(
      async () => (await readServerSystem(page, uuid)).check.map((check) => check.label),
      { message: 'the edit saved both checks' },
   ).toEqual([
      'E2E Rejected Delete A',
      'E2E Rejected Delete B Edited',
   ]);
});

test('a toggle made while a rejected Delete is in flight is kept', async () => {
   const { uuid, sheet } = await weaponWithChecks('E2E Inflight Weapon', [
      'E2E Inflight A',
      'E2E Inflight B',
   ]);

   /** @type {import('@playwright/test').Locator} The check rows. */
   const rows = sheet.locator('li.reorder-row');
   await expect(rows, 'both checks render').toHaveCount(2);
   await settle(page, { transitions: true });
   await interceptUpdates(uuid, 'reject', true);

   // The method is called directly and not awaited: the rejection is read after the toggle.
   await page.evaluate(async (uuid) => {
      globalThis.titanVeto.pending = (await fromUuid(uuid)).deleteCheck(0).then(
         () => null,
         (error) => error.message,
      );
   }, uuid);
   await expect(rows, 'the delete removed the first row from the sheet').toHaveCount(1);
   await rows.nth(0).getByRole('button', { name: 'Collapse' }).click();
   await expect.poll(() => readExpansion(rows), { message: 'the remaining row collapsed' }).toEqual([false]);
   await failHeldUpdate();
   expect(
      await page.evaluate(() => globalThis.titanVeto.pending),
      'the delete update was rejected',
   ).toBe('E2E update rejected');
   expect(await releaseUpdates(), 'the rejected update reached the item once').toBe(1);
   await expect(rows, 'the rejection put the first row back').toHaveCount(2);
   await settle(page, { transitions: true });
   await expect.poll(
      () => readExpansion(rows),
      { message: 'the toggle of the second row survived the take-back' },
   ).toEqual([
      true,
      false,
   ]);
});

test('Enter in a check label input sends no update', async () => {
   const { uuid, sheet } = await weaponWithChecks('E2E Enter Weapon', ['E2E Enter A']);

   /** @type {import('@playwright/test').Locator} The check's label input. */
   const input = sheet.locator('li.reorder-row .header .label input').first();
   await interceptUpdates(uuid, 'observe');

   // An edit first proves that the interception sees this item's updates.
   await commitText(input, 'E2E Enter B');
   await expect.poll(
      () => page.evaluate(() => globalThis.titanVeto.attempts),
      { message: 'the edit reached the interception' },
   ).toBeGreaterThan(0);
   await settle(page);

   /** @type {number} The updates seen before Enter. */
   const before = await page.evaluate(() => globalThis.titanVeto.attempts);

   // The input has not changed since it gained focus, so Enter fires no change event; only a form submission could
   // send an update.
   await input.focus();
   await input.press('Enter');
   await settle(page, { transitions: true });
   expect(await releaseUpdates(), 'Enter sent no update').toBe(before);
});

test('a click on the Add Check button sends only its own update', async () => {
   const { uuid, sheet } = await weaponWithChecks('E2E Own Update Weapon', ['E2E Own Update A']);
   await interceptUpdates(uuid, 'observe');
   await sheet.getByRole('button', { name: 'Add Check' }).click();
   await expect.poll(
      async () => (await readServerSystem(page, uuid)).check.length,
      { message: 'the click stored the new check' },
   ).toBe(2);
   await settle(page);
   expect(await releaseUpdates(), 'the click sent one update').toBe(1);
});
